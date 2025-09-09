/**
 * 入口文件
 *
 * 本文件为默认扩展入口文件，如果你想要配置其它文件作为入口文件，
 * 请修改 `extension.json` 中的 `entry` 字段；
 *
 * 请在此处使用 `export`  导出所有你希望在 `headerMenus` 中引用的方法，
 * 方法通过方法名与 `headerMenus` 关联。
 *
 * 如需了解更多开发细节，请阅读：
 * https://prodocs.lceda.cn/cn/api/guide/
 */
import * as extensionConfig from '../extension.json';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function activate(status?: 'onStartupFinished', arg?: string): void {}

// 打开库选择器
export async function openLibrarySelector(): Promise<void> {
        await eda.sys_IFrame.openIFrame('/iframe/library-selector.html', 400, 200);
}

// 获取已选择的库UUID
async function getSelectedLibraryUuid(): Promise<string> {
    try {
        const selectedLibraryType = await eda.sys_Storage.getExtensionUserConfig('selectedLibraryType');
        
        switch (selectedLibraryType) {
            case 'personal':
                return await eda.lib_LibrariesList.getPersonalLibraryUuid();
            case 'project':
                return await eda.lib_LibrariesList.getProjectLibraryUuid();
            case 'other':
                // 对于其他库，从Storage获取用户选择的具体库UUID
                const specificLibraryUuid = await eda.sys_Storage.getExtensionUserConfig('selectedSpecificLibraryUuid');
                if (specificLibraryUuid) {
                    return specificLibraryUuid;
                }
                // 如果没有选择具体库，返回系统库UUID作为默认值
                return await eda.lib_LibrariesList.getSystemLibraryUuid();
            case 'system':
            default:
                return await eda.lib_LibrariesList.getSystemLibraryUuid();
        }
    } catch (error) {
        // 出错时返回系统库UUID
        return await eda.lib_LibrariesList.getSystemLibraryUuid();
    }
}

// 批量放置符号主函数
export async function batchPlaceSymbol(): Promise<void> {
	
		// 先读取CSV文件
		const fileResult = await eda.sys_FileSystem.openReadFileDialog();
		
		if (!fileResult) {
			return;
		}
		
		let file;
		if (Array.isArray(fileResult)) {
			if (fileResult.length === 0) {
				return;
			}
			file = fileResult[0];
		} else {
			file = fileResult;
		}
		
		if (!file || typeof file.text !== 'function') {
			return;
		}
		
		const csvContent = await file.text();
		
		// 解析CSV内容并直接放置符号
		await placeSymbolsFromCSV(csvContent);
	
}

// 批量放置封装主函数
export async function batchPlaceFootprint(): Promise<void> {
	
		// 先读取CSV文件
		const fileResult = await eda.sys_FileSystem.openReadFileDialog();
		
		if (!fileResult) {
			return;
		}
		
		let file;
		if (Array.isArray(fileResult)) {
			if (fileResult.length === 0) {
				return;
			}
			file = fileResult[0];
		} else {
			file = fileResult;
		}
		
		if (!file || typeof file.text !== 'function') {
			return;
		}
		
		const csvContent = await file.text();
		
		// 解析CSV内容并直接放置封装
		await placeFootprintsFromCSV(csvContent);
	
}

// 解析CSV文件内容（支持名称,坐标格式，兼容表头）
function parseCSVWithCoordinates(csvContent: string): Array<{name: string, x: number, y: number}> {
    const lines = csvContent.trim().split('\n');
    const footprints = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
        
        // 跳过表头行（检查第一行是否包含常见的表头关键词）
        if (i === 0) {
            const firstColumn = columns[0].toLowerCase();
            if (firstColumn.includes('name') || firstColumn.includes('名称') || 
                firstColumn.includes('封装') || firstColumn.includes('component')) {
                continue; // 跳过表头行
            }
        }
        
        // 支持格式：封装名称,X坐标,Y坐标
        if (columns.length >= 3) {
            const name = columns[0];
            const x = parseFloat(columns[1]);
            const y = parseFloat(columns[2]);
            
            if (!isNaN(x) && !isNaN(y)) {
                footprints.push({ name, x, y });
            }
        }
    }
    
    return footprints;
}



// 根据CSV内容直接放置封装
async function placeFootprintsFromCSV(csvContent: string): Promise<void> {
    const footprints = parseCSVWithCoordinates(csvContent);
    
    if (footprints.length === 0) {
        eda.sys_Dialog.showInformationMessage('CSV文件中没有找到有效的封装数据');
        return;
    }
    
    let successCount = 0;
    let failedCount = 0;
    const failedItems: string[] = [];
    
    try {
        eda.sys_Dialog.showInformationMessage(`找到 ${footprints.length} 个封装，开始放置...`);
        
        for (let index = 0; index < footprints.length; index++) {
            const item = footprints[index];
            
            try {
                // 搜索封装和器件
                const libUuid = await getSelectedLibraryUuid();
                
                const footprintResult = await eda.lib_Footprint.search(item.name, libUuid);
                const deviceResult = await eda.lib_Device.search(item.name, libUuid);
                
                if (!footprintResult || footprintResult.length === 0) {
                    failedCount++;
                    failedItems.push(`${item.name}: 未找到封装`);
                    continue;
                }
                
                if (!deviceResult || deviceResult.length === 0) {
                    failedCount++;
                    failedItems.push(`${item.name}: 未找到器件`);
                    continue;
                }
                
                // 必须完全匹配名称
                let selectedFootprint = null;
                let selectedDevice = null;
                
                // 查找完全匹配的封装
                for (const fp of footprintResult) {
                    if (fp.name === item.name) {
                        selectedFootprint = fp;
                        break;
                    }
                }
                
                if (!selectedFootprint) {
                    failedCount++;
                    failedItems.push(`${item.name}: 封装名称不完全匹配`);
                    continue;
                }
                
                // 查找完全匹配的器件（通过footprintName匹配）
                for (const dev of deviceResult) {
                    if (dev.footprintName === item.name) {
                        selectedDevice = dev;
                        break;
                    }
                }
                
                if (!selectedDevice) {
                    failedCount++;
                    failedItems.push(`${item.name}: 器件封装名称不完全匹配`);
                    continue;
                }
                
                // 直接在指定坐标创建器件
                await eda.pcb_PrimitiveComponent.create(
                    {libraryUuid: libUuid, uuid: selectedDevice.uuid}, 
                    1, // EPCB_LayerId.TOP
                    item.x, 
                    item.y
                );
                
                successCount++;
                
                // 添加小延迟以避免界面卡顿
                if (index % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                
            } catch (error) {
                failedCount++;
                failedItems.push(`${item.name}: ${error.message}`);
            }
        }
        
        // 批量放置完成
        // 将失败详情写入日志
        if (failedItems.length > 0) {
            eda.sys_Log.add(`批量放置失败详情 (共${failedItems.length}项):`);
            failedItems.forEach(item => {
                eda.sys_Log.add(`  ${item}`);
            });
        }
        
        // 弹窗只显示简要统计信息
        eda.sys_Dialog.showInformationMessage(
            `批量放置完成！成功: ${successCount}, 失败: ${failedCount}${failedItems.length > 0 ? '\n\n详细失败信息请查看日志面板' : ''}`
        );
        
    } catch (error) {
        eda.sys_Message.showToastMessage(`批量放置过程中发生错误: ${error.message}`, 'error');
    }
}

// 根据CSV内容直接放置符号
async function placeSymbolsFromCSV(csvContent: string): Promise<void> {
    const symbols = parseCSVWithCoordinates(csvContent);
    
    if (symbols.length === 0) {
        eda.sys_Dialog.showInformationMessage('CSV文件中没有找到有效的符号数据');
        return;
    }
    
    let successCount = 0;
    let failedCount = 0;
    const failedItems: string[] = [];
    
    try {
        eda.sys_Dialog.showInformationMessage(`找到 ${symbols.length} 个符号，开始放置...`);
        
        for (let index = 0; index < symbols.length; index++) {
            const item = symbols[index];
            
            try {
                // 搜索符号和器件
                const libUuid = await getSelectedLibraryUuid();
                
                const symbolResult = await eda.lib_Symbol.search(item.name, libUuid);
                const deviceResult = await eda.lib_Device.search(item.name, libUuid);
                
                if (!symbolResult || symbolResult.length === 0) {
                    failedCount++;
                    failedItems.push(`${item.name}: 未找到符号`);
                    continue;
                }
                
                if (!deviceResult || deviceResult.length === 0) {
                    failedCount++;
                    failedItems.push(`${item.name}: 未找到器件`);
                    continue;
                }
                
                // 必须完全匹配名称
                let selectedSymbol = null;
                let selectedDevice = null;
                
                // 查找完全匹配的符号
                for (const sym of symbolResult) {
                    if (sym.name === item.name) {
                        selectedSymbol = sym;
                        break;
                    }
                }
                
                if (!selectedSymbol) {
                    failedCount++;
                    failedItems.push(`${item.name}: 符号名称不完全匹配`);
                    continue;
                }
                
                // 查找完全匹配的器件（通过symbolName匹配）
                for (const dev of deviceResult) {
                    if (dev.symbolName === item.name) {
                        selectedDevice = dev;
                        break;
                    }
                }
                
                if (!selectedDevice) {
                    failedCount++;
                    failedItems.push(`${item.name}: 器件符号名称不完全匹配`);
                    continue;
                }
                
                // 直接在指定坐标创建器件（符号坐标需要放大100倍）
                await eda.sch_PrimitiveComponent.create(
                    {libraryUuid: libUuid, uuid: selectedDevice.uuid}, 
                    item.x * 100, 
                    item.y * 100
                );
                
                successCount++;
                
                // 添加小延迟以避免界面卡顿
                if (index % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
                
            } catch (error) {
                failedCount++;
                failedItems.push(`${item.name}: ${error.message}`);
            }
        }
        
        // 批量放置完成
        // 将失败详情写入日志
        if (failedItems.length > 0) {
            eda.sys_Log.add(`批量放置符号失败详情 (共${failedItems.length}项):`);
            failedItems.forEach(item => {
                eda.sys_Log.add(`  ${item}`);
            });
        }
        
        // 弹窗只显示简要统计信息
        eda.sys_Dialog.showInformationMessage(
            `批量放置符号完成！成功: ${successCount}, 失败: ${failedCount}${failedItems.length > 0 ? '\n\n详细失败信息请查看日志面板' : ''}`
        );
        
    } catch (error) {
        eda.sys_Message.showToastMessage(`批量放置符号过程中发生错误: ${error.message}`, 'error');
    }
}

export function about(): void {
	eda.sys_Dialog.showInformationMessage(
		"批量放置元件 v1.0.1\n\n支持CSV文件导入的批量放置元件工具。\n\n功能：\n- 批量放置PCB封装\n- 批量放置原理图符号",
	);
}
