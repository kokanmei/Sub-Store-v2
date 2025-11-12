/**
 * Sub-Store 脚本：根据节点 IP/域名 自动查询地理位置并重命名
 * 
 * 功能:
 * 1. 遍历所有节点。
 * 2. 使用 ip-api.com 查询每个节点的地理位置和ISP信息。
 * 3. 按照 "[国家代码] 城市 - ISP - 序号" 的格式重命名节点。
 * 4. 自动处理重命名后的名称冲突问题。
 * 5. 对于查询失败的节点，保留其原始名称。
 *
 * 使用方法:
 * 1. 在 Sub-Store 的 "进阶" -> "脚本" 中创建此脚本。
 * 2. 在你的订阅配置的 "操作流程" 中添加此脚本。
 * 
 * API: http://ip-api.com/json/{server}?lang=zh-CN
 */

module.exports.parse = async (raw, { axios, yaml, notify }) => {
  const proxies = yaml.parse(raw).proxies;
  const nameCounters = {}; // 用于处理重命名后的名称冲突

  // 使用 Promise.all 并发处理，加快速度
  await Promise.all(proxies.map(async (proxy) => {
    const server = proxy.server;
    if (!server) {
      // 如果节点没有 server 字段，则跳过
      return;
    }

    try {
      // 调用 ip-api.com API
      // lang=zh-CN 表示使用中文返回结果
      const url = `http://ip-api.com/json/${server}?lang=zh-CN&fields=status,message,countryCode,city,isp`;
      const response = await axios.get(url, {
        // 设置一个合理的超时时间，防止单个请求卡住太久
        timeout: 5000 
      });

      const data = response.data;

      if (data.status === 'success') {
        const countryCode = data.countryCode || 'N/A';
        const city = data.city || 'N/A';
        const isp = data.isp || 'N/A';
        
        // 生成基础名称，例如 "[US] Los Angeles - Google"
        const baseName = `[${countryCode}] ${city} - ${isp}`;

        // 处理名称冲突：如果基础名称已存在，则在末尾添加序号
        if (nameCounters[baseName]) {
          nameCounters[baseName]++;
          proxy.name = `${baseName} ${String(nameCounters[baseName]).padStart(2, '0')}`;
        } else {
          nameCounters[baseName] = 1;
          proxy.name = `${baseName} 01`;
        }
        
        console.log(`节点 "${server}" 重命名为 -> "${proxy.name}"`);

      } else {
        // API 查询失败，在日志中记录原因
        console.log(`节点 "${proxy.name}" (${server}) 查询失败: ${data.message}`);
        // 可选择在此处给查询失败的节点一个特殊标记
        // proxy.name = `[查询失败] ${proxy.name}`;
      }
    } catch (error) {
      // 网络请求或其他错误
      console.log(`处理节点 "${proxy.name}" (${server}) 时发生错误: ${error.message}`);
      // 同样，可选择给错误节点一个标记
      // proxy.name = `[处理错误] ${proxy.name}`;
    }
  }));

  return yaml.stringify({ proxies });
}
