const jwt = require('jsonwebtoken');

const redis = global.utils.redis;
const helpers = require('../utils/helpers');

/*******************
 *  Authenticate
 *  @param: (Access) token
 ********************/
exports.auth = (token, done) => {
  jwt.verify(token, global.env.JWT_CERT, (err, decoded) => {
    if (err) {
      let customErr = '';

      switch (err.message) {
        case 'jwt expired':
          return done(10400);
        case 'invalid token':
          return done(10411);
        default:
          return done(err.message);
      }
    } else {
      const userData = {
        idx: decoded.idx,
        id: decoded.id,
        nickname: decoded.nickname,
        avatar: decoded.avatar
      }
      done(null, userData);
    }
  });
};


/*******************
 *  Authenticate
 *  @param: (Refresh) token
 ********************/
exports.refresh = (token, done) => {
  // 1. 먼저 해당 jwt가 유효한지 확인
  return new Promise((resolve, reject) => {
    this.auth(token, (err, userData) => {
      if (err) {
        reject(10400);
      } else {
        resolve(userData);
      }
    });
  })
  .then((userData) => {
    // 2. redis에 존재하는지 확인
    return new Promise((resolve, reject) => {
      redis.hgetall('refreshTokens', (err, object) => {
        console.log(object);
        if (object[token]) { // 해당 토큰이 존재할 경우
          const expiresIn = helpers.getAfterDate(); // 7일 후 삭제될 날짜
          redis.hmset('refreshTokens', token.refreshToken, 
            JSON.stringify({ idx: userData.idx, id: userData.id, expiresIn })); // 갱신
          const result = {
            accessToken: jwt.sign(userData, global.env.JWT_CERT, {'expiresIn': "12h"})
          };

          resolve(result);          
        } else {
          reject(10411);
        }
      });
    });
  });
};