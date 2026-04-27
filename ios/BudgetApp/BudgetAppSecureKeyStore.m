#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <Security/Security.h>

static NSString *const kBudgetAppSecureKeyStoreService = @"com.budgetapp.securekeys";
static NSString *const kBudgetAppSecureKeyStoreAccount = @"mmkv-storage-key-v2";
static NSUInteger const kBudgetAppMMKVKeyLength = 16;
static NSString *const kBudgetAppSecureKeyStoreFallbackDefaultsKey = @"BudgetAppSecureKeyStore.mmkv-storage-key-v2";

@interface BudgetAppSecureKeyStore : NSObject <RCTBridgeModule>
 + (NSMutableDictionary *)baseQuery;
 + (NSString *)readStoredKey;
 + (void)storeKey:(NSString *)key;
 + (NSString *)generateMMKVKey;
 + (NSString *)readFallbackKey;
 + (void)storeFallbackKey:(NSString *)key;
 + (BOOL)isRecoverableKeychainError:(OSStatus)status;
@end

@implementation BudgetAppSecureKeyStore

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getOrCreateMMKVKey)
{
  NSString *existingKey = [[self class] readStoredKey];
  if (existingKey != nil) {
    return existingKey;
  }

  NSString *generatedKey = [[self class] generateMMKVKey];
  [[self class] storeKey:generatedKey];
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
    return [self readFallbackKey];
  }
  if (status != errSecSuccess) {
    if ([self isRecoverableKeychainError:status]) {
      NSLog(@"[BudgetAppSecureKeyStore] Keychain read unavailable (%d), using fallback storage.", (int)status);
      return [self readFallbackKey];
    }

    NSLog(@"[BudgetAppSecureKeyStore] Keychain read failed with status %d, using fallback storage when available.", (int)status);
    return [self readFallbackKey];
  }

  NSData *data = CFBridgingRelease(result);
  if (data.length == 0) {
    return [self readFallbackKey];
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
    NSLog(@"[BudgetAppSecureKeyStore] Keychain write failed with status %d, storing fallback key locally.", (int)status);
    [self storeFallbackKey:key];
    return;
  }
}

+ (NSString *)generateMMKVKey
{
  static NSString *const characters = @"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  uint8_t randomBytes[kBudgetAppMMKVKeyLength];
  OSStatus status = SecRandomCopyBytes(kSecRandomDefault, sizeof(randomBytes), randomBytes);
  if (status != errSecSuccess) {
    NSString *fallbackUUID = [[[NSUUID UUID].UUIDString stringByReplacingOccurrencesOfString:@"-" withString:@""] substringToIndex:kBudgetAppMMKVKeyLength];
    NSLog(@"[BudgetAppSecureKeyStore] Secure random generation failed with status %d, using UUID fallback.", (int)status);
    return fallbackUUID;
  }

  NSMutableString *result = [NSMutableString stringWithCapacity:kBudgetAppMMKVKeyLength];
  for (NSUInteger index = 0; index < kBudgetAppMMKVKeyLength; index += 1) {
    uint8_t value = randomBytes[index];
    unichar character = [characters characterAtIndex:(NSUInteger)(value % characters.length)];
    [result appendFormat:@"%C", character];
  }

  return result;
}

+ (NSString *)readFallbackKey
{
  NSString *key = [[NSUserDefaults standardUserDefaults] stringForKey:kBudgetAppSecureKeyStoreFallbackDefaultsKey];
  if (key.length == 0) {
    return nil;
  }

  return key;
}

+ (void)storeFallbackKey:(NSString *)key
{
  if (key.length == 0) {
    return;
  }

  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  [defaults setObject:key forKey:kBudgetAppSecureKeyStoreFallbackDefaultsKey];
  [defaults synchronize];
}

+ (BOOL)isRecoverableKeychainError:(OSStatus)status
{
  return status == errSecMissingEntitlement
    || status == errSecNotAvailable
    || status == errSecInteractionNotAllowed
    || status == errSecAuthFailed;
}

@end
