#import <React/RCTBridgeModule.h>
#import <Security/Security.h>

static NSString *const kBudgetAppSecureKeyStoreService = @"com.budgetapp.securekeys";
static NSString *const kBudgetAppSecureKeyStoreAccount = @"mmkv-storage-key-v2";
static NSUInteger const kBudgetAppMMKVKeyLength = 16;

@interface BudgetAppSecureKeyStore : NSObject <RCTBridgeModule>
@end

@implementation BudgetAppSecureKeyStore

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getOrCreateMMKVKey)
{
  NSString *existingKey = [self readStoredKey];
  if (existingKey != nil) {
    return existingKey;
  }

  NSString *generatedKey = [self generateMMKVKey];
  [self storeKey:generatedKey];
  return generatedKey;
}

+ (NSMutableDictionary *)baseQuery
{
  return [@{
    (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
    (__bridge id)kSecAttrService: kBudgetAppSecureKeyStoreService,
    (__bridge id)kSecAttrAccount: kBudgetAppSecureKeyStoreAccount,
  } mutableCopy];
}

+ (NSString *)readStoredKey
{
  NSMutableDictionary *query = [self baseQuery];
  query[(__bridge id)kSecReturnData] = @YES;
  query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;

  CFTypeRef result = nil;
  OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
  if (status == errSecItemNotFound) {
    return nil;
  }
  if (status != errSecSuccess) {
    @throw [NSException exceptionWithName:@"BudgetAppSecureKeyStoreError"
                                   reason:[NSString stringWithFormat:@"Keychain read failed with status %d", (int)status]
                                 userInfo:nil];
  }

  NSData *data = CFBridgingRelease(result);
  if (data.length == 0) {
    return nil;
  }

  return [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
}

+ (void)storeKey:(NSString *)key
{
  NSData *data = [key dataUsingEncoding:NSUTF8StringEncoding];
  NSMutableDictionary *query = [self baseQuery];

  SecItemDelete((__bridge CFDictionaryRef)query);

  query[(__bridge id)kSecValueData] = data;
  query[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;

  OSStatus status = SecItemAdd((__bridge CFDictionaryRef)query, nil);
  if (status != errSecSuccess) {
    @throw [NSException exceptionWithName:@"BudgetAppSecureKeyStoreError"
                                   reason:[NSString stringWithFormat:@"Keychain write failed with status %d", (int)status]
                                 userInfo:nil];
  }
}

+ (NSString *)generateMMKVKey
{
  static NSString *const characters = @"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  uint8_t randomBytes[kBudgetAppMMKVKeyLength];
  OSStatus status = SecRandomCopyBytes(kSecRandomDefault, sizeof(randomBytes), randomBytes);
  if (status != errSecSuccess) {
    @throw [NSException exceptionWithName:@"BudgetAppSecureKeyStoreError"
                                   reason:[NSString stringWithFormat:@"Secure random generation failed with status %d", (int)status]
                                 userInfo:nil];
  }

  NSMutableString *result = [NSMutableString stringWithCapacity:kBudgetAppMMKVKeyLength];
  for (NSUInteger index = 0; index < kBudgetAppMMKVKeyLength; index += 1) {
    uint8_t value = randomBytes[index];
    unichar character = [characters characterAtIndex:(NSUInteger)(value % characters.length)];
    [result appendFormat:@"%C", character];
  }

  return result;
}

@end
