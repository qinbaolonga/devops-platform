const mysql = require('mysql2/promise');
const crypto = require('crypto');

// 加密服务模拟
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-32-characters!!';
  }

  decrypt(encryptedText) {
    try {
      const textParts = encryptedText.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encrypted = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('解密失败:', error.message);
      return null;
    }
  }
}

async function testDecryption() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 60331,
    user: 'evaadmin',
    password: 'evaDKS579<>?',
    database: 'devops_platform'
  });

  const [rows] = await connection.execute(
    'SELECT name, ip, username, password FROM hosts WHERE ip = ?',
    ['10.255.230.136']
  );

  if (rows.length > 0) {
    const host = rows[0];
    console.log('主机信息:', {
      name: host.name,
      ip: host.ip,
      username: host.username,
      encryptedPassword: host.password.substring(0, 20) + '...'
    });

    const encryptionService = new EncryptionService();
    const decryptedPassword = encryptionService.decrypt(host.password);
    
    console.log('解密结果:', decryptedPassword ? '成功' : '失败');
    if (decryptedPassword) {
      console.log('密码长度:', decryptedPassword.length);
    }
  }

  await connection.end();
}

testDecryption().catch(console.error);