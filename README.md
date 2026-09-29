# PC·XRAY · 透视你的电脑

读取本机真实硬件信息，用可交互的 3D 透视模型展示电脑内部结构：CPU 的每个核心、内存条、固态硬盘、散热、电池……点一下就能看到它是什么、参数多少、现在状态如何。

## 运行

```bash
pnpm install
pnpm dev          # http://127.0.0.1:3000
```

服务只监听 `127.0.0.1`，硬件信息不会暴露到局域网。

其他命令：

```bash
pnpm snapshot [out.json]   # 导出本机硬件快照（默认 snapshot.json）
pnpm build && pnpm start   # 生产模式
pnpm typecheck && pnpm lint
```

## 功能

- **3D 透视模型**：玻璃外壳 + 主板、SoC（P / E / LP-E 核按真实拓扑排布）、核显、内存、SSD、无线网卡、电池、热管风扇。
- **爆炸视图**（`E`）：各层分开展示，CPU 的计算模块 / 核显 / SoC 模块会分离。
- **温度视图**（`T`）：部件按实时温度着色（蓝 → 绿 → 红）。
- **实时数据**：每 2 秒刷新负载、每核频率与温度、内存占用、风扇转速、电池。核心亮度随负载变化，风扇按真实转速旋转。
- **通俗讲解**：每个部件的说明都由真实数据生成（例如大小核分工、双通道带宽计算、电池健康度）。
- **整机诊断**：内存压力、交换空间、CPU 温度、单/双通道、电池老化、磁盘空间。
- **快照导入 / 导出**：可以把别人的 `snapshot.json` 导入查看。导出前已去除序列号、MAC、IP、UUID。

- **真实外观**（`V`）：PBR 材质 + 本地生成的环境反射与阴影；主板丝印与贴片元件、内存金手指与颗粒丝印、SSD/电池/网卡贴纸（文字来自真实数据）、热管风扇、键盘与屏幕都做了细节。

快捷键：`V` 真实外观 · `E` 爆炸视图 · `T` 温度视图 · `L` 标签 · `R` 重置视角 · `Esc` 取消选择。

### 深链接

```
/?part=cpu&exploded=1&heat=1&labels=0&style=real
```

`part` 可选 `board` `cpu` `gpu` `ram-0` `ssd-0` `battery` `cooling` `wifi` `display` `input`。

## 结构

```
src/lib/collect/     硬件采集（systeminformation + Linux sysfs/hwmon/SPD）
  machine.ts         静态信息，缓存 60s  → GET /api/machine
  live.ts            实时数据            → GET /api/live
  linux.ts           CPU 拓扑、hwmon 传感器、DDR5 SPD 解码
src/lib/parts.ts     部件列表与讲解文案
src/lib/insights.ts  整机诊断规则
src/components/scene 3D 场景（React Three Fiber + drei）
src/components/ui    HUD、工具栏、概览、详情面板
scripts/snapshot.mts 命令行快照
```

## 平台说明

- 为 Linux 优化：CPU 拓扑读取 `/sys/devices/cpu_*`，内存频率与颗粒从 `spd5118` 驱动的 SPD EEPROM 解码（无需 root）。
- Windows / macOS 可以运行（依靠 systeminformation），但核心分类、内存细节和部分传感器会缺失或靠估算。
- 3D 布局是按笔记本通用结构绘制的示意图，部件数量和参数是真实的，位置不是该机型的精确还原。
