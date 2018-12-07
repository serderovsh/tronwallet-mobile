import RealmStoreMock from '../../infra-data/__mocks__/realm.store.mock'
import SecretsStore from '../secrets.store'

describe('Secret store', () => {
  let _secretStore, _store, _mockData, _RNTron

  beforeEach(() => {
    _mockData = [
      { key: 1, value: 'a', hide: false },
      { key: 2, value: 'b', hide: true }
    ]

    _RNTron = {
      generateKeypair: () => ({})
    }

    _store = new RealmStoreMock('key', _mockData)
    _secretStore = new SecretsStore(_store, _RNTron)
  })

  describe('Create user secret account', () => {
    test('should create when account name and mnemonic was filled', async () => {
      const accountName = 'Asdf 1234'
      const mnemonic = 'asdf qwer zxcv'

      const newUser = await _secretStore.create(accountName, mnemonic)

      const expected = {
        mnemonic,
        name: accountName,
        alias: '@asdf_1234',
        confirmed: true,
        hide: false
      }

      expect(newUser).toEqual(expected)
    })

    test('should not create when account name wasn\'t filled', async () => {
      const accountName = ''
      const mnemonic = 'asdf qwer zxcv'

      const newUser = await _secretStore.create(accountName, mnemonic)

      expect(newUser).toBeNull()
    })

    test('should not create when mnemonic wasn\'t filled', async () => {
      const accountName = 'Asdf 1234'
      const mnemonic = ''

      const newUser = await _secretStore.create(accountName, mnemonic)

      expect(newUser).toBeNull()
    })
  })

  describe('Create FIRST user secret account', () => {
    test('should create when mnemonic filled and accounts is empty', async () => {
      const store = new RealmStoreMock('key', [])
      const secretStore = new SecretsStore(store, _RNTron)

      const mnemonic = 'asdf qwer zxcv'

      const newUser = await secretStore.createFirstAccount(mnemonic)

      const expected = {
        mnemonic,
        name: 'Main account',
        alias: '@main_account',
        confirmed: true,
        hide: false
      }

      expect(newUser).toEqual(expected)
    })

    test('should not create when mnemonic wasn\'t filled and accounts isn\'t empty', async () => {
      const mnemonic = ''

      const newUser = await _secretStore.createFirstAccount(mnemonic)

      expect(newUser).toBeNull()
    })

    test('should not create when mnemonic wasn\'t filled', async () => {
      const mnemonic = ''

      const newUser = await _secretStore.createFirstAccount(mnemonic)

      expect(newUser).toBeNull()
    })

    test('should not create when accounts isn\'t empty', async () => {
      const mnemonic = 'asdf qwer zxcv'

      const newUser = await _secretStore.createFirstAccount(mnemonic)

      expect(newUser).toBeNull()
    })
  })

  describe('List accounts', () => {
    test('should return all accounts when accounts list exist', () => {
      const accounts = _secretStore.findAllAccounts()

      expect(accounts).toMatchObject(_mockData)
    })

    test('should return empty list when accounts list is empty', () => {
      const store = new RealmStoreMock('key', [])
      const secretStore = new SecretsStore(store)

      const accounts = secretStore.findAllAccounts()

      expect(accounts).toHaveLength(0)
    })

    test('should return only visible accounts when list have visible accounts', () => {
      const accounts = _secretStore.findVisibleAccounts()

      expect(accounts).toEqual([{ key: 1, value: 'a', hide: false }])
    })

    test('should return empty list when list doesn\'t have visible accounts', () => {
      const store = new RealmStoreMock('key', [{ key: 1, value: 'a', hide: true }])
      const secretStore = new SecretsStore(store)

      const accounts = secretStore.findVisibleAccounts()

      expect(accounts).toHaveLength(0)
    })
  })
})