---
title: 表现层设计 cue
sidebar:
  order: 5
---

本系统的核心哲学是：**意图与资源彻底解耦、严格的性能剔除、基于集中式注册表的智能资产寻址，以及逻辑驱动与资产自决的闭环生命周期管理**。

## 架构边界与“黑盒资产”模式 

采用**“瘦配置层，胖资产层（Thin Config, Thick Asset）”**的设计思想，严格界定能力系统配置与底层游戏引擎（如 Godot 的 `.tscn` 或 Unity 的 `Prefab`）的职责边界：

* **表现层配置 (Cue Layer)**：秉持“极简声明”原则。在配置中，任何表现表现仅仅是一个**高度抽象的意图入口**（如 `VFX`）。逻辑层只负责界定该意图的**触发时机、生命周期归属（Anchor）与空间挂载位置（Socket）**，彻底剥离具体的物理寻址与播放逻辑。
* **引擎资产层 (Engine Asset Layer)**：视听细节被**严格封装为绝对黑盒**。诸如激光轨迹运算 (`LineVFX`)、屏幕震动 (`CameraShake`)、顿帧定格 (`HitStop`) 或定制化文本等复合表现，均在引擎预制体内自闭环实现，**严禁**在 `Cue` 的通信协议中向下穿透或进行字段膨胀。
* **数据流转契约 (Data Flow Contract)**：上下游基于标准接口（如 `OnSetup`）进行单向通信。引擎资产被动接收**高度浓缩的上下文载荷**——包含瞬时强度（`magnitude`）、实体引用（`instigator / target`）与环境修饰（`tags`），随后由资产内部逻辑自主解析这些抽象数据，并驱动内部的粒子、组件或全局渲染管线。

    ```csharp
    public interface ICueHandler {
        void OnSetupCue(in CueContext ctx);
        void OnUpdateCue(in CueParams parameters);   
        void OnDetachCue();
    }
    ```

这种设计确保了协议层的极度收敛：TA 和表现美术可以在引擎侧自由拼装极其复杂的复合视听反馈，而无需增加逻辑系统的心智负担和表结构复杂度。


## 运行时上下文

当底层管线触发效果时，系统向目标 Actor 的表现组件广播 `CueEvent`。

```csharp
public static class CueDispatcher
{
    public static void FireCue(DCueKeyInstant cue, in CueContext ctx){}
    // 持续挂载
    public static void AttachCue(long bindingId, DCueKeyLoop cue,
                                 in CueContext ctx){}
    // 刷新：连 Context 都不需要，只需要路由键和变化的值
    public static void UpdateCue(long bindingId, DCueKeyLoop cue, 
                                Actor target, CueParams parameters){}
    // 卸载
    public static void DetachCue(long bindingId, DCueKeyLoop cue, 
                                Actor target){}
}

public readonly record struct CueContext(
    Actor Target,       // 承受者 / 表现锚点宿主
    Actor Instigator,   // 发起者
    Actor Causer,       // 媒介 (如飞行中的子弹实例)
    
    IntList ContextTags,// Event的瞬态标签快照 (如 ["Damage.Element.Fire"])
    CueParams Parameters
);

public struct CueParams {
    private float magnitude; // 强度数值
    private int[] keys; // var_key
    private float[] values;
    private int size;
}
```


表现层基于**单向广播**机制运作。逻辑层仅负责在生命周期的关键节点派发标准事件，严格遵守“黑盒”边界，绝不干预底层的具体视听实现。

通信契约按生命周期特征分为两大类：

### 瞬态指令 (Fire-and-forget)
* **FireCue (触发)**：即放即走。引擎层收到指令后立即交由资产管线生成，**不进入任何状态缓存**。实例的生命周期由底层资产（如粒子时长、音频长度）自决销毁。

### 持久指令 (Stateful)
* **AttachCue (装载)**：状态表现的起点。引擎层需将逻辑源的唯一标识（`bindingId`）与表现实例建立映射缓存，正式接管其生命周期。
* **UpdateCue (刷新)**：状态演进。当逻辑状态变更（如 Buff 叠层、数值动态衰减）时，系统通过 `bindingId` 寻址并调用对应资产的 `OnUpdate` 接口，驱动特效缩放、材质参数等动态变化。
* **DetachCue (卸载)**：状态终结。遵循**“逻辑终止 ≠ 物理销毁”**的核心契约。系统收到指令后立即解除 `bindingId` 映射，并通知底层资产进入退出阶段。资产应执行平滑过渡（如音效淡出、粒子停止发射），表现收尾后再自行销毁回收。

### 单体视觉唯一性与引用计数 (CueComponent)

为根除同类状态并发时引发的视觉穿模、音频相位抵消及 GPU Overdraw 灾难，系统在 Actor 级别的 `CueComponent` 中确立了**单体视觉唯一性法则**：**同一 Actor 身上，同一种持续表现（`CueId`）最多仅允许存在一个底层资产实例。**

系统通过内置的**引用计数与高水位机制**来支撑该法则，实现逻辑源与视觉实体的完美解耦：

1. **降维寻址 (Dimensionality Reduction)**
   表现层内部以表现标识（`CueId`）作为缓存池的主键，从数据结构层面确保视觉唯一。

2. **引用计数防误卸 (Ref Counting)**
   * **Attach 时**：记录请求来源的 `bindingId`，对应 `CueId` 的引用计数加 1。**仅当计数由 0 变 1 时，才真正实例化底层资产。**
   * **Detach 时**：精准移除对应的 `bindingId` 记录，引用计数减 1。**仅当计数归零时，才真正调用底层资产的 `OnDetach` 进行物理卸载。** 此机制完美规避了多来源状态时间交错造成的“提前卸载” Bug。

3. **高水位参数决断 (High-Water Mark)**
   当多个独立逻辑源（不同 `bindingId`）并发请求同一表现，且主张不同的表现强度（如 A 施加 1 层毒，B 施加 5 层毒）时：
   * `CueComponent` 会自动轮询当前该 `CueId` 下活跃的 `bindingId` 集合。
   * 提取其中**最高的 Magnitude（强度值）**，统一将其下发给底层资产的 `OnUpdate` 接口。确保唯一的视觉实例始终忠实且平滑地反映当前最极致的逻辑状态。

---

## cue注册表

逻辑层派发的 `cueKey` 在此处被翻译为具体的“资源请求”。

### 瞬发型

```cfg
// 瞬发型：一波流释放，自动回收。
// 允许通过 role 跨实体表现 (如：在 Instigator 身上播放吸血流轨迹)。
table cue_registry_instant[cueKey] {
    cueKey: str ->cue_key_instant (nullable);
    vfx: list<InstantVfx> (block=1);        
    sfx: list<InstantSfx> (block=1);
    floatingTexts: list<FloatingText> (block=1); // 飘字
}

// 含 role，可跨实体
struct InstantVfx {
    role: CueRole;
    attach: VfxAttach;
    socket: str;
    asset: str -> vfx_metadata;   
}

struct InstantSfx { 
    role: CueRole;
    asset: str -> sfx_metadata; 
}

struct FloatingText {
    role: CueRole;
    asset: str ->floating_text_metadata;
}

enum VfxAttach { WorldStatic; FollowTarget; }
enum CueRole { Target; Instigator; Causer; }
```

### 持续型

```cfg
// 持续型：跟随 Status/SpawnObj 同生共死。
table cue_registry_loop[cueKey] {
    cueKey: str ->cue_key_loop (nullable);
    vfx: list<LoopVfx> (block=1);  
    sfx: list<LoopSfx> (block=1);
    materials: list<MaterialOverride> (block=1); // 材质状态覆写
}

// 无 role，必定挂载在宿主 Actor 身上
struct LoopVfx { 
    attach: VfxAttach; 
    socket: str;
    asset: str -> vfx_metadata; 
}

struct LoopSfx { 
    asset: str -> sfx_metadata; 
}

struct MaterialOverride {
    slotIndex: int;
    asset: str ->mat_metadata;
}
```

---

## 资产库

这是标签驱动的基石。我们将所有同类表现资源打包成一个个“资产池”。引擎启动时读取此表，作为资源寻址的数据库。

```cfg
// 特效资产库
table vfx_metadata[asset] {
    asset: str; 
    description: text;
    concurrency: str -> cue_concurrency;
    entries: list<VfxAsset> (block=1);
}

// 声效资产库
table sfx_metadata[asset] {
    asset: str; 
    description: text;
    concurrency: str -> cue_concurrency;
    cooldown: float; // 时间防爆音冷却
    entries: list<TagAsset> (block=1);
}

// 材质资产库
table mat_metadata[asset] {
    asset: str; 
    description: text;
    priority: int; // 该材质在材质栈中的优先级（如：霸体 > 冰冻 > 中毒）
    entries: list<TagAsset> (block=1);
}

// 飘字资产库
table floating_text_metadata[asset] {
    asset: str;
    description: text;
    concurrency: str -> cue_concurrency;
    hideIfBelowMagnitude: float; // 忽略机制
    mergeMode: TextMergeMode;
    mergeWindow: float; // 聚合时间窗口 (如 0.2s)
    entries: list<TagAsset> (block=1);
}

struct VfxAsset {
    assetPath: str; 
    tags: list<str> -> gameplaytag (pack); 
    cullDistance: float;  // 跟相机距离太大就剔除
}

struct TagAsset {
    assetPath: str; 
    tags: list<str> -> gameplaytag (pack); 
}

enum TextMergeMode {
    None;    // 独立弹出：绝不合并 (适用于单发慢速武器、暴击)
    // 节奏批处理：在内存中偷偷累加，窗口期满后【生成 1 个】新飘字。
    Batch;   // -> 适用于：DOT、HOT、或者存在微小时间差的多发霰弹枪。
    // 滚动刷新：【立刻生成】飘字，后续伤害持续叠加并【刷新原有UI节点】的数值与存活时间。
    Rolling; // -> 适用于：激光束、喷火器、高频持续切割。
    Highest; // 取最高值：窗口期内只显示最大的那个数字。
}
```

### 并发组规则表

```cfg
// 并发组规则表
table cue_concurrency[groupId] {
    groupId: str;  // 例如："LightHits" (轻受击), "HeavyExplosions" (大爆炸), "Ambient" (环境)
    maxCount: int; // 该通道的全局最大存活数量
    resolveRule: ResolveRule; // 超出限制时的解决策略
}

enum ResolveRule {
    StopOldest;  // 顶替最老的：杀掉该组中存活最久的实例，为新请求腾出空间 (适用于连续受击)
    RejectNew;   // 拒绝新的：保留旧的，直接丢弃新请求 (适用于持续性范围光环)
    StopLowest;  // 优先顶替 Magnitude 最低的实例
}
```

### 总结

1. **`vfx_metadata` (特效)**：拦数量 (Concurrency) + 拦空间 (Cull Distance)
2. **`sfx_metadata` (音效)**：拦数量 (Concurrency) + 拦时间频次 (Cooldown)
3. **`floating_text_metadata` (UI)**：拦数量 (Concurrency) + 清洗聚合 (Merge & Threshold)
4. **`mat_metadata` (材质)**：仅靠优先级决断 (Priority Stack)，**不设并发拦截**，绝对忠实于状态语义。

### 边界界定：全局控制 vs 单体约束

本系统中的表现层防过载由两道防线构成，各司其职：
1. **逻辑层的单体约束（CueComponent 引用计数）**：解决 **“同源重叠”**（同一个怪物身上挂了十层毒，只播一团毒雾）。关注点在于逻辑上的严密合一与单体防穿模。
2. **资产层的全局控制（cue_concurrency）**：解决 **“多源同类爆发”**（一个法术同时点燃了同屏 50 个怪物，为了防掉帧和爆音，最多只渲染 10 团火）。关注点在于硬件性能兜底与视听焦点的清洗。

---

## 资产解析算法

表现系统的寻址是一个严密的**两阶段过程**：首先在树状拓扑中回退寻找可用的`cue_registry`，随后在具体的资产池`metadata`中基于标签进行打分决断。

### 阶段一：意图层级回退

参照`ability-design.md`里的`cue_key_instant`、`cue_key_loop`

**解析路由规则**：当逻辑层派发一个 `cueKey` 时，底层执行以下上溯逻辑：
1. **本级探查**：检查当前 `cueKey` 是否绑定了非空的 `cue_registry`。若有，则直接提取并阻断寻址。
2. **祖先回退**：若自身 `cue_registry` 为空，则严格按照 `ancestors` 列表的顺序（由近及远：父级 -> 祖父级）逐层上溯。
3. **命中提取**：返回第一个非空的 `cue_registry`

### 阶段二：资产加权匹配
获取到对应的`metadata`后，底层解析其内部引用的各个资产池`entries`（如 `Vfx.Hit`）。此时表现层不执行任何硬编码的 `if-else` 分支，而是利用当前事件的标签快照进行**加权语义匹配**。

对于资产池中的每一个候选条目 $A$，其匹配得分 $S$ 计算如下：

$$S = \text{Count}(\text{A.Tags} \cap \text{Event.Tags}) \times 100 + \text{Count}(\text{A.Tags} \cap \text{Target.Tags})$$

* **优先匹配事件标签**：如 `Damage.Element.Fire`，这代表了本次动作的“本质”。
* **其次匹配宿主状态**：如 `State.Debuff.Frozen`，这代表了表现的“环境”。

### 寻址完整示例

* **逻辑输入**：由于暴击，逻辑管线触发了 `Hit.Physical.Critical` 事件，`ContextTags` 携带了 `[Damage.Element.Fire]`。
* **执行步骤**：
    1. **层级回退**：查表发现 `Hit.Physical.Critical` 未单独配置注册表（`cue_registry` 为空）。
    2. **向上上溯**：读取其 `ancestors`，定位到父节点 `Hit.Physical`。发现该父节点拥有有效的配置，成功获取其 `cue_registry`。
    3. **请求资产**：`cue_registry` 请求播放 `Vfx.Hit` 资产池。
    4. **加权打分**：在 `Vfx.Hit` 的候选列表中评估：
        * `vfx_default_spark` (无标签) -> **Score: 0** (兜底候选)
        * `vfx_ice_shatter` (`[State.Debuff.Frozen]`) -> **Score: 0**
        * `vfx_fire_explosion` (`[Damage.Element.Fire]`) -> **Score: 100** 🏆 **最终选中**
* **结果**：系统优雅地播放了一场带有火焰属性的通用物理受击表现，全程零硬编码。

---

## 生命周期管理

**持续型表现的生命周期必须且仅能与其挂载的 Actor 绑定。** 

| Logic Source | 事件  | 广播目标 | BindingId |
| :--- | :--- | :--- | :--- |
| `Effect.FireCue` / `ResolveCombat.cues`... | CueEvent | `target` | `0` (即放即走) |
| `Status` 首次挂载 | CueEvent | host | `StatusInstance.uid` |
| `Status` 层数变化 / 时长刷新 | UpdateCueEvent | host | `StatusInstance.uid` |
| `Status` 移除 (过期/驱散/死亡) | DetachCueEvent | host | `StatusInstance.uid` |
| `SpawnObj` (子弹/法阵) 诞生 | CueEvent | self | `SpawnObj.uid` |
| `SpawnObj` (子弹/法阵) 销毁 | DetachCueEvent | self | `SpawnObj.uid` |
| `Ability` 进入前摇/蓄力/引导 | AttachCueEvent | owner | AbilityInstance.uid | 
| `Ability` 阶段切换/被打断/结束 | DetachCueEvent | owner | AbilityInstance.uid | 

> 注：bindingId 作为逻辑层实例的唯一身份证，在事件总线中起到了“精确路由”与“引用计数鉴权”的关键作用，表现层必须妥善记录来源以应对复杂的状态重入与多源叠加。

---

## 实现

### 材质优先级调度
对于 `MaterialOverride`，针对每个 Actor 维护一个**活跃材质映射表**，利用 `bindingId` 实现无序的精准移除，并基于 `priority` 动态裁决最终渲染

### 飘字聚合策略 (Floating Text Batching)
针对割草类游戏的高频伤害，表现层提供内置聚合：
* **Batch (批处理)**：在 `mergeWindow` (如 0.2s) 内收到的所有伤害，合并为一个数字弹出。
* **Rolling (滚动刷新)**：第一个数字弹出后，后续数字在原 UI 位置累加，并重置 UI 的消失动画时间。

---

## 配置指南

> **核心原则**：你作为逻辑配置者，**严禁**硬编码资源路径，**严禁**直接操作表现生命周期。

1.  **标签即表现**：在 `ResolveCombat` 中务必带上准确的 `tags`（如 `Damage.Element.Lightning`）。
2.  **意图对齐**：
    * 若是瞬发动作（如受击、爆炸），在 `Effect` 中调用 `FireCue`。
    * 若是持续状态（如 Buff、光环、材质变化），将 `cue_key` 填入 `Status` 的 `cuesWhileActive` 字段。
3.  **参数传递**：利用 `magnitude` 传递关键数值（如暴击倍率、叠层数），利用CueParams来传递其他参数，表现层会自动根据此值调整。

