(function (PT) {
  'use strict';

  // The only file that touches the DOM, and the only one holding mutable state.
  // It invents no behaviour: every decision it renders comes from a pure module
  // that already passes its own tests.

  var store = null;     // whole persisted Store
  var current = null;   // Prompt being edited
  var el = {};

  function $(id) { return document.getElementById(id); }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.toast.classList.remove('on'); }, 1500);
  }

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  // ── persistence ───────────────────────────────────────────────────────────
  function persist() {
    if (current) {
      var i = store.prompts.findIndex(function (p) { return p.id === current.id; });
      if (i >= 0) { store.prompts[i] = current; } else { store.prompts.unshift(current); }
    }
    PT.store.save(store);
  }

  function commit(next, opts) {
    current = next;
    persist();
    renderPreview();
    if (!opts || !opts.keepSections) { renderSections(); }
    renderSidebar();
  }

  // ── preview ───────────────────────────────────────────────────────────────
  function renderPreview() {
    var text = current ? PT.serialize.toXml(current) : '';
    el.preview.innerHTML = esc(text).replace(/^(&lt;\/?[a-z0-9_]+&gt;)$/gm, '<span class="t">$1</span>');
    el.charCount.textContent = text ? text.length + ' chars' : '';
  }

  // ── sections ──────────────────────────────────────────────────────────────
  function renderSections() {
    el.sections.innerHTML = '';
    el.empty.style.display = current ? 'none' : '';
    el.promptBar.style.display = current ? '' : 'none';
    if (!current) { return; }

    current.sections.forEach(function (s, i) {
      var wrap = document.createElement('div');
      wrap.className = 'section' + (s.include ? '' : ' off');
      wrap.dataset.id = s.id;

      var head = document.createElement('div');
      head.className = 'section-head';

      var num = document.createElement('span');
      num.className = 'section-num';
      num.textContent = i + 1;
      num.draggable = true;
      num.title = 'drag to reorder';
      head.appendChild(num);

      var tag = document.createElement('input');
      tag.className = 'section-tag';
      tag.value = '<' + s.tag + '>';
      tag.spellcheck = false;
      tag.addEventListener('focus', function () { tag.value = s.tag; });
      tag.addEventListener('blur', function () {
        commit(PT.model.setSection(current, s.id, { tag: tag.value }));
      });
      tag.addEventListener('keydown', function (e) { if (e.key === 'Enter') { tag.blur(); } });
      head.appendChild(tag);

      var lab = document.createElement('label');
      var inc = document.createElement('input');
      inc.type = 'checkbox';
      inc.checked = s.include;
      inc.addEventListener('change', function () {
        commit(PT.model.setSection(current, s.id, { include: inc.checked }));
      });
      lab.appendChild(inc);
      lab.appendChild(document.createTextNode('include'));
      lab.title = 'include this section in the output';
      head.appendChild(lab);

      var sp = document.createElement('div'); sp.className = 'grow'; head.appendChild(sp);

      var del = document.createElement('button');
      del.className = 'icon'; del.textContent = '×'; del.title = 'delete section';
      del.addEventListener('click', function () {
        commit(PT.model.removeSection(current, s.id));
      });
      head.appendChild(del);
      wrap.appendChild(head);

      var body = document.createElement('textarea');
      body.className = 'section-body';
      body.value = s.body;
      body.spellcheck = false;
      body.placeholder = '…';
      body.addEventListener('input', function () {
        autoSize(body);
        commit(PT.model.setSection(current, s.id, { body: body.value }), { keepSections: true });
      });
      body.addEventListener('keydown', function (e) { onKeydown(e, body); });
      body.addEventListener('blur', hideAc);
      wrap.appendChild(body);

      // drag to reorder, grabbed by the number chip
      num.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', s.id);
        wrap.classList.add('drag');
      });
      num.addEventListener('dragend', function () { wrap.classList.remove('drag'); });
      wrap.addEventListener('dragover', function (e) { e.preventDefault(); });
      wrap.addEventListener('drop', function (e) {
        e.preventDefault();
        var moved = e.dataTransfer.getData('text/plain');
        if (moved && moved !== s.id) { commit(PT.model.moveSection(current, moved, i)); }
      });

      el.sections.appendChild(wrap);
      autoSize(body);
    });
  }

  function autoSize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.max(74, ta.scrollHeight + 2) + 'px';
  }

  // ── tab completion ────────────────────────────────────────────────────────
  // `start`/`end` bracket the span Tab last replaced. Cycling must reuse that span,
  // not re-derive it from the caret: once "Unreal Engine" is inserted, the word
  // before the caret is "Engine", so re-deriving would restart the search and
  // multi-word completions could never cycle.
  var cyc = { prefix: null, list: [], at: 0, start: -1, end: -1, ta: null };

  function prefixAt(ta) {
    var upto = ta.value.slice(0, ta.selectionStart);
    var m = /[A-Za-z][A-Za-z0-9_-]*$/.exec(upto);
    return m ? { text: m[0], start: upto.length - m[0].length } : null;
  }

  function docTerms() {
    if (!current) { return []; }
    return PT.complete.harvest(current.sections.map(function (s) { return s.body; }).join('\n'));
  }

  function bankTerms() {
    return (store.bank || []).map(function (t) { return t.text; });
  }

  function onKeydown(e, ta) {
    if (e.key === 'Escape') { hideAc(); return; }
    if (e.key !== 'Tab' || e.shiftKey || e.ctrlKey || e.altKey) {
      if (e.key !== 'Shift') { cyc.prefix = null; hideAc(); }
      return;
    }
    // Still sitting at the end of the last insertion? Then this is a cycle,
    // not a new search.
    var continuing = cyc.prefix !== null && cyc.ta === ta && ta.selectionStart === cyc.end;

    if (continuing) {
      e.preventDefault();
      cyc.at = (cyc.at + 1) % Math.max(1, cyc.list.length);
    } else {
      var p = prefixAt(ta);
      if (!p) { return; }
      e.preventDefault();
      cyc = { prefix: p.text, list: PT.complete.candidates(p.text, docTerms(), bankTerms()),
              at: 0, start: p.start, end: ta.selectionStart, ta: ta };
    }
    if (!cyc.list.length) { hideAc(); return; }

    var pick = cyc.list[cyc.at];
    var before = ta.value.slice(0, cyc.start);
    var after = ta.value.slice(cyc.end);
    ta.value = before + pick + after;
    cyc.end = before.length + pick.length;
    ta.selectionStart = ta.selectionEnd = cyc.end;

    autoSize(ta);
    commit(PT.model.setSection(current, ta.closest('.section').dataset.id, { body: ta.value }),
      { keepSections: true });
    showAc(ta, cyc);
  }

  function showAc(ta, c) {
    if (c.list.length < 2) { hideAc(); return; }
    el.ac.innerHTML = c.list.map(function (t, i) {
      return '<div class="' + (i === c.at ? 'on' : '') + '"><b>' +
        esc(t.slice(0, c.prefix.length)) + '</b>' + esc(t.slice(c.prefix.length)) + '</div>';
    }).join('');
    var r = ta.getBoundingClientRect();
    el.ac.style.display = 'block';
    el.ac.style.left = Math.min(r.left + 14, window.innerWidth - 350) + 'px';
    el.ac.style.top = Math.min(r.bottom - 6, window.innerHeight - el.ac.offsetHeight - 10) + 'px';
  }

  function hideAc() { el.ac.style.display = 'none'; }

  // ── sidebar ───────────────────────────────────────────────────────────────
  function renderSidebar() {
    var hits = PT.search.prompts(store, el.qPrompts.value, { kind: el.filterKind.value });
    el.listPrompts.innerHTML = '';
    hits.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'row' + (current && p.id === current.id ? ' on' : '');
      var filled = p.sections.filter(function (s) { return s.body.trim(); }).length;
      row.innerHTML =
        '<div class="row-title">' + esc(p.name || 'untitled') +
        (p.kind === 'template' ? ' <span class="badge">TPL</span>' : '') + '</div>' +
        '<div class="row-sub">' + p.sections.length + ' sections · ' + filled + ' filled</div>';
      row.addEventListener('click', function () { open(p); });
      el.listPrompts.appendChild(row);
    });

    var tags = PT.search.tags(store);
    var keep = el.filterTag.value;
    el.filterTag.innerHTML = '<option value="">all tags</option>' +
      tags.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
    el.filterTag.value = tags.indexOf(keep) >= 0 ? keep : '';

    var sh = PT.search.sections(store, el.qSections.value, { tag: el.filterTag.value });
    el.listSections.innerHTML = '';
    sh.forEach(function (h) {
      if (!h.section.body.trim()) { return; }
      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML =
        '<div class="row-title"><span class="tagchip">&lt;' + esc(h.section.tag) + '&gt;</span></div>' +
        '<div class="row-sub">' + esc(h.section.body.slice(0, 70)) + '</div>' +
        '<div class="row-sub" style="color:var(--surface3)">from ' + esc(h.promptName || 'untitled') + '</div>';
      row.title = 'copy this section into the current prompt';
      row.addEventListener('click', function () {
        if (!current) { toast('No prompt open'); return; }
        commit(PT.model.addSection(current, PT.model.cloneSection(h.section), null));
        toast('Copied in — the original is untouched');
      });
      el.listSections.appendChild(row);
    });
  }

  function open(p) {
    current = p;
    el.promptName.value = p.name;
    renderSections(); renderPreview(); renderSidebar();
  }

  // ── clipboard, with a file:// safe fallback ───────────────────────────────
  function copy(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* nothing else to try */ }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Copied'); }, function () {
        fallback(); toast('Copied');
      });
    } else { fallback(); toast('Copied'); }
  }

  function download(name, text, mime) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  // ── wiring ────────────────────────────────────────────────────────────────
  function wire() {
    el.btnNew.addEventListener('click', function () {
      var p = PT.model.newPrompt({ name: '', kind: 'filled' });
      store.prompts.unshift(p);
      open(p); persist(); renderSidebar();
      el.promptName.focus();
    });

    el.btnAddSection.addEventListener('click', function () {
      if (!current) { return; }
      commit(PT.model.addSection(current, PT.model.newSection({ tag: 'custom' }), null));
      var tas = el.sections.querySelectorAll('.section-tag');
      if (tas.length) { tas[tas.length - 1].focus(); }
    });

    el.btnTemplate.addEventListener('click', function () {
      if (!current) { return; }
      current.kind = current.kind === 'template' ? 'filled' : 'template';
      current.updated = Date.now();
      persist(); renderSidebar();
      toast(current.kind === 'template' ? 'Marked as template' : 'Marked as filled');
    });

    el.btnDelete.addEventListener('click', function () {
      if (!current) { return; }
      if (!confirm('Delete "' + (current.name || 'untitled') + '"? This cannot be undone.')) { return; }
      store.prompts = store.prompts.filter(function (p) { return p.id !== current.id; });
      current = null;
      PT.store.save(store);
      el.promptName.value = '';
      renderSections(); renderPreview(); renderSidebar();
      toast('Deleted');
    });

    el.promptName.addEventListener('input', function () {
      if (!current) { return; }
      current.name = el.promptName.value;
      current.updated = Date.now();
      persist(); renderSidebar();
    });

    [el.qPrompts, el.qSections].forEach(function (i) { i.addEventListener('input', renderSidebar); });
    [el.filterKind, el.filterTag].forEach(function (i) { i.addEventListener('change', renderSidebar); });

    el.btnCopy.addEventListener('click', function () { copy(el.preview.textContent); });

    el.btnSaveFile.addEventListener('click', function () {
      if (!current) { return; }
      var name = (current.name || 'prompt').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
      download(name + '.xml', PT.serialize.toXml(current), 'text/plain');
      toast('Saved .xml');
    });

    el.btnExport.addEventListener('click', function () {
      download('promptool-export.json', PT.store.exportJson(store), 'application/json');
      toast('Exported');
    });

    el.btnImport.addEventListener('click', function () { el.fileImport.click(); });
    el.fileImport.addEventListener('change', function () {
      var f = el.fileImport.files[0];
      if (!f) { return; }
      f.text().then(function (text) {
        var r = PT.store.importJson(text);
        if (!r.ok) { toast('Import failed — ' + r.error); return; }
        store = r.store;
        PT.store.save(store);
        current = null;
        el.promptName.value = '';
        renderSections(); renderPreview(); renderSidebar();
        toast('Imported ' + store.prompts.length + ' prompts');
      });
      el.fileImport.value = '';
    });

    el.btnBank.addEventListener('click', function () {
      el.bankText.value = bankTerms().join('\n');
      el.dlgBank.showModal();
    });
    el.btnBankSave.addEventListener('click', function () {
      var seen = Object.create(null);
      store.bank = el.bankText.value.split('\n')
        .map(function (t) { return t.trim(); })
        .filter(function (t) { if (!t || seen[t]) { return false; } seen[t] = 1; return true; })
        .map(function (t) { return { id: PT.model.newId('t'), text: t, created: Date.now() }; });
      PT.store.save(store);
      el.dlgBank.close();
      toast(store.bank.length + ' terms saved');
    });
    el.btnBankClose.addEventListener('click', function () { el.dlgBank.close(); });

    // Ctrl+M banks the current selection, so a phrase becomes completable everywhere.
    document.addEventListener('keydown', function (e) {
      if (!e.ctrlKey || e.altKey || String(e.key).toLowerCase() !== 'm') { return; }
      var a = document.activeElement;
      var sel = (a && a.tagName === 'TEXTAREA')
        ? a.value.slice(a.selectionStart, a.selectionEnd)
        : String(window.getSelection());
      sel = (sel || '').trim();
      if (!sel) { toast('Select something first'); return; }
      e.preventDefault();
      if (bankTerms().indexOf(sel) >= 0) { toast('Already banked'); return; }
      store.bank.push({ id: PT.model.newId('t'), text: sel, created: Date.now() });
      PT.store.save(store);
      toast('Banked: ' + sel);
    });

    window.addEventListener('resize', hideAc);
  }

  // ── boot ──────────────────────────────────────────────────────────────────
  function boot() {
    ['sections', 'preview', 'toast', 'ac', 'empty', 'prompt-bar', 'prompt-name', 'char-count',
     'list-prompts', 'list-sections', 'q-prompts', 'q-sections', 'filter-kind', 'filter-tag',
     'btn-new', 'btn-add-section', 'btn-template', 'btn-delete', 'btn-copy', 'btn-save-file',
     'btn-bank', 'btn-export', 'btn-import', 'file-import', 'dlg-bank', 'bank-text',
     'btn-bank-save', 'btn-bank-close'].forEach(function (id) {
      el[id.replace(/-(.)/g, function (m, c) { return c.toUpperCase(); })] = $(id);
    });

    store = PT.store.load();
    if (!store.prompts.length && !store.bank.length && PT.seed) {
      store = PT.seed.build();
      PT.store.save(store);
    }

    wire();
    renderSidebar();
    renderSections();
    renderPreview();
  }

  PT.ui = { boot: boot };
  document.addEventListener('DOMContentLoaded', boot);
})(window.PT = window.PT || {});
