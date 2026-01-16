const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 开始测试后端API...\n');

  try {
    // 1. 测试系统信息接口（公开接口）
    console.log('1. 测试系统信息接口...');
    const systemInfo = await axios.get(`${BASE_URL}/system/info`);
    console.log('✅ 系统信息:', systemInfo.data);
    console.log('');

    // 2. 测试登录接口
    console.log('2. 测试登录接口...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123456'
    });
    console.log('✅ 登录成功:', loginResponse.data);
    
    const token = loginResponse.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('');

    // 3. 测试获取用户信息
    console.log('3. 测试获取用户信息...');
    const profile = await axios.get(`${BASE_URL}/auth/profile`, { headers });
    console.log('✅ 用户信息:', profile.data);
    console.log('');

    // 4. 测试获取项目列表
    console.log('4. 测试获取项目列表...');
    const projects = await axios.get(`${BASE_URL}/projects`, { headers });
    console.log('✅ 项目列表:', projects.data);
    console.log('');

    // 5. 测试获取用户列表
    console.log('5. 测试获取用户列表...');
    const users = await axios.get(`${BASE_URL}/users`, { headers });
    console.log('✅ 用户列表:', users.data);
    console.log('');

    // 6. 测试获取系统统计
    console.log('6. 测试获取系统统计...');
    const stats = await axios.get(`${BASE_URL}/system/stats`, { headers });
    console.log('✅ 系统统计:', stats.data);
    console.log('');

    console.log('🎉 所有API测试通过！');

  } catch (error) {
    console.error('❌ API测试失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else {
      console.error('错误信息:', error.message);
    }
  }
}

testAPI();