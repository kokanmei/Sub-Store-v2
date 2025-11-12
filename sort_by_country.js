/**
 * @description Sub-Store 排序脚本：按自定义的区域优先级排序
 * @author YourName
 */
async function sort(proxies) {
  console.log('开始执行自定义优先级排序脚本...');

  // --- 这部分和版本一完全相同 ---
  const proxiesInfo = await utils.getProxiesInfo(proxies);
  const countryCodeMap = new Map();
  proxiesInfo.forEach(info => {
    countryCodeMap.set(info.name, info.country_code || 'ZZ');
  });
  console.log('节点信息获取完毕，开始排序...');
  
  // 1. 定义你的区域优先级列表
  // 列表中的顺序就是你想要的最终顺序。可以按需修改。
  const priorityRegions = ['HK', 'TW', 'SG', 'JP', 'US', 'KR'];
  
  // 2. 使用更复杂的比较逻辑进行排序
  proxies.sort((a, b) => {
    const countryA = countryCodeMap.get(a.name);
    const countryB = countryCodeMap.get(b.name);

    // 获取两个国家在优先级列表中的位置（索引）
    // 如果不在列表中，indexOf 会返回 -1
    const indexA = priorityRegions.indexOf(countryA);
    const indexB = priorityRegions.indexOf(countryB);

    // 排序逻辑判断：
    // Case 1: 节点 A 的地区在优先级列表，节点 B 的不在 -> A 排前面
    if (indexA !== -1 && indexB === -1) {
      return -1;
    }
    // Case 2: 节点 B 的地区在优先级列表，节点 A 的不在 -> B 排前面
    if (indexA === -1 && indexB !== -1) {
      return 1;
    }
    // Case 3: 两个节点的地区都在优先级列表 -> 谁的索引小（位置靠前）谁就排前面
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // Case 4: 两个节点的地区都不在优先级列表 -> 按国家代码字母顺序排
    if (countryA < countryB) {
      return -1;
    }
    if (countryA > countryB) {
      return 1;
    }

    // 最后，如果以上所有条件都相同（例如两个都在优先级列表外，且国家代码也相同）
    // 则按节点名称排序
    return a.name.localeCompare(b.name);
  });
  
  console.log('自定义优先级排序完成。');
  
  // 3. 返回最终排序的数组
  return proxies;
}
