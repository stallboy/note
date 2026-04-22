
## 一、 真的会有多个 Ability 同时释放吗？

**答案是：绝对会，而且这是现代动作/RPG游戏的标配。**

如果游戏只允许同一时间运行一个技能，那整个战斗就会变成回合制的“排队执行”。你之所以在架构中设计了 `SafeList<AbilityInstance>` 以及 `maxConcurrentAbilitiesPerActor`，正是为了支持以下高频场景：

1. **上下半身分离（分层动画机制）**：
   * 玩家正在按住摇杆施放“移动”技能（Ability A，控制下半身）。
   * 同时玩家按下了“射击”或“挥砍”（Ability B，控制上半身）。
   * 这两个 Ability 必须同时存在于 `activeInstances` 中，分别经历自己的生命周期。
2. **脱手类 / 独立施法类**：
   * 玩家正在引导（Channel）一个持续回血的法阵（Ability A）。
   * 期间玩家受到惊吓，秒放了一个无施法前摇的“瞬发护盾”（Ability B）。这个护盾不打断引导，两者必须并发。
3. **复合指令的容差**：
   * 在极其极限的帧数下，玩家可能同时按下了“冲刺”和“战吼”。如果条件允许，底层应该允许它们同时进入 `Activating` 阶段，然后由后续系统去融合或表现。

**为什么你需要 `TagRules`？**
如果系统本身就不允许并发，那么你在 `tag_rules` 里设计的 `blocksAbilities` 就失去了一大半意义。正是因为系统**默认允许多个 Ability 并发**，才需要策划通过 `Ability A` 挂载 `State.Casting` 标签，配合 `blocksAbilities` 来**显式地阻断** `Ability B` 的施放。
而 `maxConcurrentAbilitiesPerActor` 只是一个兜底的物理极限防线（比如设置为 5），防止死循环或者恶意发包导致的内存泄漏。

---

## 为什么普通移动不能是 Ability？

这是一个非常经典且极其重要的架构分水岭问题。

直接给你结论：**普通移动（通过 WASD 或摇杆的日常行走/跑动）绝对不应该是 Ability。**
但是，**战术移动（翻滚、闪避、带有无敌帧的冲刺、瞬移）必须是 Ability。**

在你的架构下，将普通移动做成 Ability 会带来巨大的灾难。以下是核心原因，以及普通移动该如何与你的技能系统“握手”的标准做法。


1. **生命周期模型不匹配**：Ability 拥有严密的 `Activating -> Processing -> Executing -> Recovering` 状态机与资源 Commit 逻辑。而普通移动是**基于坐标轴连续输入（Axis Input）**的物理行为，每一帧都在发生，没有任何明确的“前摇”或“释放瞬间”。如果强行封装成 Ability，你会为每一步产生巨大的状态机开销。
2. **与物理引擎深度耦合**：普通移动通常由底层引擎（如 Unreal 的 `CharacterMovementComponent` 或 Godot 的 `CharacterBody`）原生接管，涉及到复杂的碰撞、斜坡计算、重力和摩擦力。技能系统是一个**高层逻辑管线**，不应该去干涉底层的物理演算。

---

### 普通移动如何与技能系统交互？（桥接方案）

既然普通移动不是 Ability，那当玩家被“眩晕”时怎么阻止他移动？当玩家移动时又怎么“打断”前摇？

答案是：**通过 TagContainer 作为唯一的通信桥梁。**

你的引擎原生移动组件（Movement Component）需要和技能系统的 `TagContainer` 达成双向契约：

#### 1. 移动组件向技能系统“汇报”（上报 Tag）
当引擎底层的移动组件检测到角色的速度大于 0（即玩家正在推动摇杆）时，它直接向角色的 `TagContainer` 中添加一个 `State.Moving` 标签。当速度归零时，移除该标签。
* **效果**：此时，你在 `tag_rules` 中配置的逻辑就会自动生效。由于 `State.Moving` 会 `cancelsAbilities: ["Ability.Startup.MoveCancel"]`，玩家一推摇杆，底层赋予了 `State.Moving`，正在施放的可取消技能就会被瞬间平滑打断。

#### 2. 技能系统向移动组件“下达禁令”（读取 Tag）
引擎的移动组件在处理玩家的 WASD/摇杆输入前，必须先查阅一次角色的 `TagContainer`。
* **效果**：你可以约定，只要 `TagContainer` 中包含 `State.Debuff.Control.Stun`（眩晕）或 `State.Immobile`（禁足）等标签，底层移动组件就直接丢弃玩家的移动输入，将速度设为 0。

---

### 总结界限

* **普通移动**：是引擎原生组件，不走 Ability 管线。它只负责在动的时候给自己挂 `State.Moving` 标签，以及在有 `State.Immobile` 标签时拒绝响应输入。
* **战术移动（如翻滚）**：必须是 Ability。因为它有 CD（`cooldown`）、有消耗（`costs`）、有明确的前后摇时间（`startupTime`, `recovery`），并且需要在持续期间挂载无敌标签给别人查询。

既然明确了普通移动的定位，那么在你的游戏中，像“按住 Shift 消耗体力加速跑（Sprint）”这种行为，你倾向于是将其做成一个持续引导的 Ability（Channel），还是仅仅作为普通移动的一个加速状态呢？


这是一个非常刁钻且经典的实战痛点。很多项目在这里选错了路，导致后期的角色手感极度别扭。

直接说我的结论：**我强烈倾向于将 Sprint（加速跑）作为“普通移动的一个加速状态”，并通过底层组件与 Tags 桥接，绝不要做成 `Channel`（引导）类型的 Ability。**

在你的这套系统架构下，如果把加速跑做成 Ability，会遇到无法优雅解决的逻辑死结。以下是深度推演：

### 为什么做成 Channel Ability 是个陷阱？

1. **复合输入与状态的割裂**：
   加速跑的成立条件其实非常严苛：不仅需要玩家“按住 Shift”，还需要“摇杆有输入” 且 “角色没有被墙挡住而在原地踏步”。
   如果做成 `Channel` Ability，Ability 的准入和生命周期只看你的按键输入。这就可能出现一个极其愚蠢的 Bug：玩家站在原地不动，按住 Shift，结果角色开始原地疯狂掉体力，并且身上还冒着加速跑的特效。
2. **物理引擎的强干预**：
   加速跑本质上是改变了底层的最大移动速度向量。如果通过 Ability 的 `Channel` 每 Tick 去强行改写物理组件的速度参数，不仅会造成执行时序上的抖动，还会跟下坡、摩擦力等物理逻辑打架。

---

## 如何用你的系统优雅地实现 Sprint？

既然加速跑是移动系统的延伸，我们就应该让**底层移动组件（Movement Component）来接管物理，用标签（Tags）和状态（Status）来接管逻辑。**

结合你的配置表标准，这套逻辑可以跑得非常漂亮：

#### 第 1 步：引擎底层的判定与发信（C++ / C# 层）
移动组件内部接管 Shift 键的输入。当组件判定角色**当前速度 > 0 且 Shift 被按下**时，它向角色的 `TagContainer` 写入 `State.Movement.Sprint` 标签。当玩家松手或停下时，移除该标签。

#### 第 2 步：纯数据驱动的属性与资源结算（配置层）
在玩家出生时，给他挂载一个永久的（`duration: -1`）被动 `Status`。这个被动完美利用了你设计的 `requiresAll` 准入条件：

```cfg
status {
    id: 9001;
    name: "基础移动机制_加速跑";
    duration: Const { value: -1.0; };
    stackingPolicy: Single { refreshMode: KeepDuration; };
    
    behaviors: [
        // 1. 只有拥有加速标签时，才提供移速加成
        StatModifier {
            stat: "MoveSpeed_Max";
            op: Mul;
            value: Const { value: 1.5; }; // 提速 50%
            requiresAll: [
                HasTags { source: ContextTarget {}; query: { requireAll: ["State.Movement.Sprint"]; }; }
            ];
        },
        
        // 2. 只有拥有加速标签时，才周期性扣除体力
        Periodic {
            period: Const { value: 0.1; }; // 每 0.1 秒扣一次，足够平滑
            executeOnApply: true;
            effect: ModifyStat {
                stat: "Resource_Stamina";
                op: Add;
                value: Const { value: -2.0; }; 
            };
            requiresAll: [
                HasTags { source: ContextTarget {}; query: { requireAll: ["State.Movement.Sprint"]; }; }
            ];
        }
    ];
}
```

#### 第 3 步：体力耗尽的自洽闭环
当体力扣到 0 时怎么办？你的系统已经有了完美的答案。
利用你定义的归零联动：`onDepletedGrantTag: ["State.StaminaEmpty"]`。
底层的移动组件在每一帧也会顺便检查：一旦发现 `TagContainer` 里出现了 `State.StaminaEmpty`，就立刻拒绝响应 Shift 加速指令，并强行移除 `State.Movement.Sprint`。被动 `Status` 发现标签没了，就会自动停止扣除体力和移速加成。

---

**总结**：将 Sprint 留在表现与物理的最底层，把你的能力系统当成一个**监听环境变化并作出响应的“精密仪表盘”**，这才是全数据驱动架构的终极魅力。

既然我们讨论到了体力归零触发 `State.StaminaEmpty` 标签，如果策划提出：“体力耗尽进入大喘气状态，该状态下不仅不能加速跑，连普攻（id: 1001）也要被禁止，直到体力恢复到 50% 以上”，你觉得在现有的架构下，应该把这个禁止普攻的逻辑写在哪里最合适？