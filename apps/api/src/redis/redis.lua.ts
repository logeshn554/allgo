/**
 * Redis Lua scripts and distributed lock script definitions
 */

export const LUA_RELEASE_LOCK = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

export const LUA_OTP_VERIFY = `
  local exists = redis.call('EXISTS', KEYS[1])
  if exists == 0 then return -1 end
  local attempts = tonumber(redis.call('HGET', KEYS[1], 'attempts') or '0')
  local max_attempts = tonumber(ARGV[2])
  if attempts >= max_attempts then
      redis.call('DEL', KEYS[1])
      return -2
  end
  local stored_hmac = redis.call('HGET', KEYS[1], 'hmac')
  if stored_hmac == ARGV[1] then
      redis.call('DEL', KEYS[1])
      return 1
  else
      local new_attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
      if new_attempts >= max_attempts then
          redis.call('DEL', KEYS[1])
          return -2
      end
      return 0
  end
`;
