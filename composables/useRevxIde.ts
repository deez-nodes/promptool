import type { IdeFile, ContractTemplate, BuildLog, DeploymentContract } from '~/types'

const DEFAULT_FILES: IdeFile[] = [
  {
    id: 'f_cargo',
    name: 'Cargo.toml',
    path: 'Cargo.toml',
    language: 'toml',
    content: `[package]
name = "flipper"
version = "0.1.0"
authors = ["Parity <admin@parity.io>"]
edition = "2021"

[dependencies]
ink = { version = "5.0.0", default-features = false }
scale = { package = "parity-scale-codec", version = "3", default-features = false, features = ["derive"] }
scale-info = { version = "2.6", default-features = false, features = ["derive"], optional = true }

[lib]
path = "lib.rs"

[features]
default = ["std"]
std = [
    "ink/std",
    "scale/std",
    "scale-info/std",
]
ink-as-dependency = []
`
  },
  {
    id: 'f_lib',
    name: 'lib.rs',
    path: 'lib.rs',
    language: 'rust',
    content: `//! RevX PolkaVM / ink! Smart Contract
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod flipper {
    /// Defines the storage of our contract.
    #[ink(storage)]
    pub struct Flipper {
        /// Stores a single \`bool\` value on the storage.
        value: bool,
        owner: AccountId,
    }

    /// Events emitted by the contract
    #[ink(event)]
    pub struct Flipped {
        #[ink(topic)]
        by: AccountId,
        new_value: bool,
    }

    impl Flipper {
        /// Constructor that initializes the \`bool\` value to the given \`init_value\`.
        #[ink(constructor)]
        pub fn new(init_value: bool) -> Self {
            let caller = Self::env().caller();
            Self {
                value: init_value,
                owner: caller,
            }
        }

        /// Constructor that initializes the \`bool\` value to \`false\`.
        #[ink(constructor)]
        pub fn default() -> Self {
            Self::new(Default::default())
        }

        /// A message that flips the value of the stored \`bool\`.
        #[ink(message)]
        pub fn flip(&mut self) {
            let caller = self.env().caller();
            self.value = !self.value;
            self.env().emit_event(Flipped {
                by: caller,
                new_value: self.value,
            });
        }

        /// Simply returns the current value of our \`bool\`.
        #[ink(message)]
        pub fn get(&self) -> bool {
            self.value
        }

        /// Returns the current contract owner
        #[ink(message)]
        pub fn get_owner(&self) -> AccountId {
            self.owner
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn default_works() {
            let flipper = Flipper::default();
            assert_eq!(flipper.get(), false);
        }

        #[ink::test]
        fn it_works() {
            let mut flipper = Flipper::new(false);
            assert_eq!(flipper.get(), false);
            flipper.flip();
            assert_eq!(flipper.get(), true);
        }
    }
}
`
  },
  {
    id: 'f_readme',
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    content: `# RevX Flipper Contract

This is a starter Rust smart contract built for the Polkadot PolkaVM execution runtime via pallet-revive and ink! v5.

## Features
- Ultra-low gas consumption with PolkaVM RISC-V compilation
- Full zero-cost unit testing in Rust (\`cargo test\`)
- Instant deployment to Paseo & Asset Hub Testnets
- Seamless prompt engineering in PrompTool (Studio tab)
`
  }
]

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'flipper',
    name: 'Flipper (Starter)',
    description: 'Minimal ink! v5 starter contract with state flip & getter.',
    category: 'Basic',
    files: DEFAULT_FILES
  },
  {
    id: 'erc20',
    name: 'PSP22 / ERC20 Token',
    description: 'Fungible token standard with transfer, approvals, balances, and mint/burn.',
    category: 'DeFi',
    files: [
      {
        id: 'f_erc20_cargo',
        name: 'Cargo.toml',
        path: 'Cargo.toml',
        language: 'toml',
        content: `[package]
name = "psp22_token"
version = "0.1.0"
edition = "2021"

[dependencies]
ink = { version = "5.0.0", default-features = false }
scale = { package = "parity-scale-codec", version = "3", default-features = false, features = ["derive"] }
scale-info = { version = "2.6", default-features = false, features = ["derive"], optional = true }

[lib]
path = "lib.rs"

[features]
default = ["std"]
std = ["ink/std", "scale/std", "scale-info/std"]
`
      },
      {
        id: 'f_erc20_lib',
        name: 'lib.rs',
        path: 'lib.rs',
        language: 'rust',
        content: `//! PSP22 Fungible Token on PolkaVM
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod token {
    use ink::storage::Mapping;

    #[ink(storage)]
    pub struct Psp22Token {
        total_supply: Balance,
        balances: Mapping<AccountId, Balance>,
        allowances: Mapping<(AccountId, AccountId), Balance>,
        name: ink::prelude::string::String,
        symbol: ink::prelude::string::String,
        decimals: u8,
        owner: AccountId,
    }

    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        value: Balance,
    }

    #[ink(event)]
    pub struct Approval {
        #[ink(topic)]
        owner: AccountId,
        #[ink(topic)]
        spender: AccountId,
        value: Balance,
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        InsufficientBalance,
        InsufficientAllowance,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    impl Psp22Token {
        #[ink(constructor)]
        pub fn new(initial_supply: Balance, name: ink::prelude::string::String, symbol: ink::prelude::string::String, decimals: u8) -> Self {
            let caller = Self::env().caller();
            let mut balances = Mapping::default();
            balances.insert(caller, &initial_supply);

            Self::env().emit_event(Transfer {
                from: None,
                to: Some(caller),
                value: initial_supply,
            });

            Self {
                total_supply: initial_supply,
                balances,
                allowances: Mapping::default(),
                name,
                symbol,
                decimals,
                owner: caller,
            }
        }

        #[ink(message)]
        pub fn total_supply(&self) -> Balance {
            self.total_supply
        }

        #[ink(message)]
        pub fn balance_of(&self, owner: AccountId) -> Balance {
            self.balances.get(owner).unwrap_or(0)
        }

        #[ink(message)]
        pub fn transfer(&mut self, to: AccountId, value: Balance) -> Result<()> {
            let from = self.env().caller();
            self.transfer_from_to(&from, &to, value)
        }

        fn transfer_from_to(&mut self, from: &AccountId, to: &AccountId, value: Balance) -> Result<()> {
            let from_balance = self.balance_of(*from);
            if from_balance < value {
                return Err(Error::InsufficientBalance);
            }
            self.balances.insert(from, &(from_balance - value));
            let to_balance = self.balance_of(*to);
            self.balances.insert(to, &(to_balance + value));

            self.env().emit_event(Transfer {
                from: Some(*from),
                to: Some(*to),
                value,
            });
            Ok(())
        }
    }
}
`
      }
    ]
  },
  {
    id: 'escrow',
    name: 'Decentralized Escrow',
    description: 'Buyer-seller escrow with arbiter timeout, deposits, and release mechanics.',
    category: 'Finance',
    files: [
      {
        id: 'f_escrow_cargo',
        name: 'Cargo.toml',
        path: 'Cargo.toml',
        language: 'toml',
        content: `[package]
name = "escrow"
version = "0.1.0"
edition = "2021"

[dependencies]
ink = { version = "5.0.0", default-features = false }
scale = { package = "parity-scale-codec", version = "3", default-features = false, features = ["derive"] }
scale-info = { version = "2.6", default-features = false, features = ["derive"], optional = true }

[lib]
path = "lib.rs"

[features]
default = ["std"]
std = ["ink/std", "scale/std", "scale-info/std"]
`
      },
      {
        id: 'f_escrow_lib',
        name: 'lib.rs',
        path: 'lib.rs',
        language: 'rust',
        content: `//! Trustless Multi-Party Escrow on PolkaVM
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod escrow {
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum State {
        AwaitingPayment,
        AwaitingDelivery,
        Complete,
        Refunded,
    }

    #[ink(storage)]
    pub struct Escrow {
        buyer: AccountId,
        seller: AccountId,
        arbiter: AccountId,
        amount: Balance,
        state: State,
    }

    #[ink(event)]
    pub struct PaymentDeposited {
        #[ink(topic)]
        buyer: AccountId,
        amount: Balance,
    }

    #[ink(event)]
    pub struct FundsReleased {
        #[ink(topic)]
        seller: AccountId,
        amount: Balance,
    }

    impl Escrow {
        #[ink(constructor, payable)]
        pub fn new(seller: AccountId, arbiter: AccountId) -> Self {
            let caller = Self::env().caller();
            let value = Self::env().transferred_value();
            Self {
                buyer: caller,
                seller,
                arbiter,
                amount: value,
                state: if value > 0 { State::AwaitingDelivery } else { State::AwaitingPayment },
            }
        }

        #[ink(message, payable)]
        pub fn deposit(&mut self) {
            assert_eq!(self.state, State::AwaitingPayment);
            assert_eq!(self.env().caller(), self.buyer);
            self.amount = self.env().transferred_value();
            self.state = State::AwaitingDelivery;
        }

        #[ink(message)]
        pub fn release_to_seller(&mut self) {
            let caller = self.env().caller();
            assert!(caller == self.buyer || caller == self.arbiter, "Unauthorized");
            assert_eq!(self.state, State::AwaitingDelivery);

            self.state = State::Complete;
            let _ = self.env().transfer(self.seller, self.amount);
            self.env().emit_event(FundsReleased {
                seller: self.seller,
                amount: self.amount,
            });
        }
    }
}
`
      }
    ]
  }
]

export function useRevxIde() {
  const files = useState<IdeFile[]>('revx_files', () => DEFAULT_FILES)
  const activeFileId = useState<string>('revx_active_file_id', () => 'f_lib')
  const isCompiling = useState<boolean>('revx_is_compiling', () => false)
  const isDeploying = useState<boolean>('revx_is_deploying', () => false)
  const buildLogs = useState<BuildLog[]>('revx_build_logs', () => [
    { id: '1', timestamp: '12:00:00', type: 'info', text: 'RevX PolkaVM IDE initialized v0.9.4-beta' },
    { id: '2', timestamp: '12:00:01', type: 'info', text: 'Target toolchain: rustc 1.84.0-nightly (polkavm-riscv32)' },
    { id: '3', timestamp: '12:00:02', type: 'success', text: 'Connected to Polkadot Paseo Testnet (wss://paseo.rpc.amforc.net)' }
  ])
  const activeBottomTab = useState<'terminal' | 'deploy' | 'ai' | 'problems'>('revx_bottom_tab', () => 'terminal')
  const selectedNetwork = useState<string>('revx_network', () => 'Paseo Testnet (PolkaVM)')
  const walletConnected = useState<boolean>('revx_wallet_connected', () => true)
  const walletAddress = useState<string>('revx_wallet_address', () => '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY (Alice)')
  const deployedContracts = useState<DeploymentContract[]>('revx_deployed_contracts', () => [
    {
      address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      name: 'Flipper',
      network: 'Paseo Testnet (PolkaVM)',
      deployedAt: 'Just now',
      abi: '{"source":{"hash":"0x4d3b..."},"contract":{"name":"Flipper"}}',
      methods: [
        { name: 'flip', mutates: true, args: [] },
        { name: 'get', mutates: false, args: [], returns: 'bool' },
        { name: 'get_owner', mutates: false, args: [], returns: 'AccountId' }
      ]
    }
  ])

  // AI Chat prompt builder
  const aiMessages = useState<{ id: string; sender: 'user' | 'assistant'; text: string; code?: string }[]>('revx_ai_msgs', () => [
    {
      id: 'm1',
      sender: 'assistant',
      text: 'Welcome to RevX App Builder! Describe the smart contract or dApp you want to construct, or switch to the PrompTool tab to engineer prompt structures with full XML serialization.'
    }
  ])
  const aiInput = useState<string>('revx_ai_input', () => '')
  const isAiThinking = useState<boolean>('revx_ai_thinking', () => false)

  const activeFile = computed(() => {
    return files.value.find(f => f.id === activeFileId.value) || files.value[0]
  })

  const addLog = (type: BuildLog['type'], text: string) => {
    const time = new Date().toTimeString().split(' ')[0]
    buildLogs.value.push({
      id: String(Date.now()) + Math.random(),
      timestamp: time,
      type,
      text
    })
  }

  const selectFile = (id: string) => {
    activeFileId.value = id
  }

  const updateFileContent = (content: string) => {
    if (activeFile.value) {
      activeFile.value.content = content
    }
  }

  const createFile = (name: string) => {
    const ext = name.split('.').pop() || 'rs'
    const lang: IdeFile['language'] = ext === 'rs' ? 'rust' : ext === 'toml' ? 'toml' : ext === 'json' ? 'json' : 'markdown'
    const newF: IdeFile = {
      id: 'f_' + Math.random().toString(36).substring(2, 9),
      name,
      path: name,
      language: lang,
      content: `// New file ${name}\n`
    }
    files.value.push(newF)
    activeFileId.value = newF.id
  }

  const deleteFile = (id: string) => {
    if (files.value.length <= 1) return
    files.value = files.value.filter(f => f.id !== id)
    if (activeFileId.value === id) {
      activeFileId.value = files.value[0].id
    }
  }

  const loadTemplate = (templateId: string) => {
    const t = CONTRACT_TEMPLATES.find(c => c.id === templateId)
    if (t) {
      files.value = JSON.parse(JSON.stringify(t.files))
      activeFileId.value = files.value.find(f => f.name.endsWith('.rs'))?.id || files.value[0].id
      addLog('info', `Loaded contract template: "${t.name}"`)
    }
  }

  const compileContract = async () => {
    if (isCompiling.value) return
    isCompiling.value = true
    activeBottomTab.value = 'terminal'
    addLog('cmd', '$ cargo +nightly contract build --release --target polkavm')

    await new Promise(r => setTimeout(r, 600))
    addLog('info', 'Compiling dependencies: ink v5.0.0, scale-codec v3.6, polkavm-derive v0.9...')

    await new Promise(r => setTimeout(r, 800))
    addLog('info', 'Generating PolkaVM RISC-V Bytecode & Contract Metadata (flipper.contract)...')

    await new Promise(r => setTimeout(r, 600))
    addLog('success', '✔ Compilation finished in 2.04s. PolkaVM binary size: 14.2 KB (14,536 bytes).')
    addLog('info', 'Artifacts saved to target/ink/flipper.{contract, json, polkavm}')
    isCompiling.value = false
  }

  const deployContract = async () => {
    if (isDeploying.value) return
    isDeploying.value = true
    activeBottomTab.value = 'terminal'
    addLog('cmd', `$ revx-deploy --network "${selectedNetwork.value}" --signer Alice`)

    await new Promise(r => setTimeout(r, 700))
    addLog('info', 'Submitting extrinsic: pallet_revive::instantiate_with_code...')

    await new Promise(r => setTimeout(r, 900))
    const fakeAddr = '5D' + Math.random().toString(36).substring(2, 10).toUpperCase() + 'PolkaVM...'
    const newDep: DeploymentContract = {
      address: fakeAddr,
      name: activeFile.value.name.replace('.rs', ''),
      network: selectedNetwork.value,
      deployedAt: 'Just now',
      abi: '{"contract":{"name":"Contract"}}',
      methods: [
        { name: 'flip', mutates: true, args: [] },
        { name: 'get', mutates: false, args: [], returns: 'bool' }
      ]
    }
    deployedContracts.value.unshift(newDep)
    addLog('success', `✔ Contract deployed successfully! Contract Address: ${fakeAddr}`)
    activeBottomTab.value = 'deploy'
    isDeploying.value = false
  }

  const sendAiPrompt = async (promptText: string) => {
    if (!promptText.trim()) return
    const userMsg = promptText.trim()
    aiInput.value = ''
    aiMessages.value.push({
      id: String(Date.now()),
      sender: 'user',
      text: userMsg
    })

    isAiThinking.value = true
    activeBottomTab.value = 'ai'

    await new Promise(r => setTimeout(r, 1000))

    let reply = `I've analyzed your smart contract requirement: "${userMsg}". Here is an optimized PolkaVM ink! v5 implementation tailored for zero gas overhead:`
    let codeSnippet = `#[ink::contract]
mod custom_contract {
    #[ink(storage)]
    pub struct CustomContract {
        data: Hash,
        author: AccountId,
    }

    impl CustomContract {
        #[ink(constructor)]
        pub fn new(data: Hash) -> Self {
            Self { data, author: Self::env().caller() }
        }

        #[ink(message)]
        pub fn get_data(&self) -> Hash {
            self.data
        }
    }
}`

    aiMessages.value.push({
      id: String(Date.now()) + '_bot',
      sender: 'assistant',
      text: reply,
      code: codeSnippet
    })

    isAiThinking.value = false
  }

  return {
    files,
    activeFileId,
    activeFile,
    isCompiling,
    isDeploying,
    buildLogs,
    activeBottomTab,
    selectedNetwork,
    walletConnected,
    walletAddress,
    deployedContracts,
    aiMessages,
    aiInput,
    isAiThinking,
    selectFile,
    updateFileContent,
    createFile,
    deleteFile,
    loadTemplate,
    compileContract,
    deployContract,
    sendAiPrompt,
    addLog
  }
}
