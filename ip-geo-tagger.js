/*
 * Sub-Store v2 兼容版 - 节点 IP 归属地自动查询脚本
 *
 * @author Your Assistant
 * @version 2.0
 */

// --- 自定义配置区域 ---
const GEOGRAPHIC_KEYWORDS = /香港|澳门|台湾|HK|MO|TW|日本|韩国|新加坡|美国|英国|法国|德国|加拿大|俄罗斯|印度|泰国|越南|菲律宾|马来西亚|土耳其|阿根廷|巴西|澳大利亚|新西兰|JP|KR|SG|US|UK|FR|DE|CA|RU|IN|TH|VN|PH|MY|TR|AR|BR|AU|NZ|京|沪|穗|杭|深|广|成都|移动|联通|电信|教育|CN|中国/;
const RENAME_FORMAT = "[${countryCode}] ${originalName}";
const API_URL = "http://ip-api.com/batch?fields=query,countryCode";

// --- 脚本主逻辑区域 ---
function operator(proxies) {
    // 在 v2 中，`$log` 是全局可用的日志对象
    $log.info("启动 v2 兼容版节点IP归属地查询脚本...");

    const proxiesToQuery = [];
    const processedProxies = [];

    proxies.forEach(p => {
        if (!GEOGRAPHIC_KEYWORDS.test(p.name)) {
            proxiesToQuery.push(p);
        } else {
            processedProxies.push(p);
        }
    });

    if (proxiesToQuery.length === 0) {
        $log.info("没有需要查询归属地的节点，脚本执行完毕。");
        return proxies;
    }

    $log.info(`共找到 ${proxiesToQuery.length} 个需要查询的节点。`);

    const servers = proxiesToQuery.map(p => p.server);

    // 使用 v2 的 http.post 方法，它返回一个 Promise
    return http.post({
        url: API_URL,
        body: servers, // v2 的 body 可能直接接收数组
        headers: { 'Content-Type': 'application/json' }
    }).then(response => {
        const results = JSON.parse(response.body);
        $log.info("成功获取API响应，开始处理...");

        results.forEach(result => {
            const proxy = proxiesToQuery.find(p => p.server === result.query);
            if (proxy) {
                if (result.countryCode) {
                    const oldName = proxy.name;
                    proxy.name = RENAME_FORMAT
                        .replace("${countryCode}", result.countryCode)
                        .replace("${originalName}", proxy.name);
                    $log.info(`节点 "${oldName}" (服务器: ${proxy.server}) 归属地为 ${result.countryCode}，已重命名为 "${proxy.name}"`);
                } else {
                    $log.warn(`无法确定节点 "${proxy.name}" (服务器: ${proxy.server}) 的归属地。`);
                    proxy.name = `[XX] ${proxy.name}`;
                }
            }
        });
        
        // 合并并返回所有节点
        return [...processedProxies, ...proxiesToQuery];

    }).catch(error => {
        $log.error("API请求失败: " + JSON.stringify(error));
        // 如果请求失败，给所有待查询节点加上未知前缀
        proxiesToQuery.forEach(p => {
            p.name = `[??] ${p.name}`;
        });
        return [...processedProxies, ...proxiesToQuery];
    });
}
