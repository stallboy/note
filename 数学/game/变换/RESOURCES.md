# 变换看几何 · 高信源清单

> 知识优先从此处取,不靠参数记忆。每条都附"覆盖什么 / 何时翻"。
> 已核实的关键源标 ✅。

## Knowledge(知识)

### 主干教材(本科水平,矩阵群优先路线)

- ✅ **John Stillwell, _The Four Pillars of Geometry_ (Springer, 2005)**
  免费 PDF:[Leiden 镜像](https://websites.math.leidenuniv.nl/edixhoven/teaching/2019-2020/CIMPA/Stillwell_Geometry.pdf) / [johnval.nl](https://www.johnval.nl/school/wiskunde/wiskundeD/gratis_studieboeken/FourPillarsOfGeometry.pdf)
  四根支柱里**线性代数**和**变换群**正占其二,与本工作区路线天然吻合。何时翻:几乎每一课的对位读物;讲变换、群、射影、非欧都好。

- ✅ **Michael Artin, _Algebra_ (Pearson/Prentice Hall, 1st ed. 1991; 2nd ed. 2013)**
  第 1 章(群)、第 4 章(线性群)、第 6 章(对称)、第 9 章(双线性型)。矩阵群从头讲,是"用 GL(n) 当原型教群论"的范本。何时翻:群公理、子群、群作用、O(n) 的严格处理;想比 Stillwell 更硬时。

- **M. A. Armstrong, _Groups and Symmetry_ (Springer UTM, 1988)**
  本科友好,用对称现象引入群论。何时翻:二面体群、晶体约束、Burnside 计数的教学化讲法。

### 原典

- ✅ **Felix Klein, "Vergleichende Betrachtungen über neuere geometrische Forschungen" (Erlangen Program, 1872)**
  英译(1892, Mellen Haskell):[arXiv:0807.3161](https://arxiv.org/abs/0807.3161);原刊 Bull. N.Y. Math. Soc. 2 (1892–93), 215–249。
  何时翻:讲爱尔兰根纲领那一课,直接读原话;注意 Klein 从未真正发表演讲,文本是就职纲领。

### 射影 / 不变量 / 进阶

- **H. S. M. Coxeter, _Introduction to Geometry_ (Wiley, 2nd ed. 1969)** — 经典综合+解析;交比、对偶、非欧的稳健参考。
- **Robin Hartshorne, _Geometry: Euclid and Beyond_ (Springer UTM, 2000)** — 希尔伯特公理 + 变换;想给欧氏几何补严格公理基础时。
- **Peter Olver, _Classical Invariant Theory_ (Cambridge, 1999)** — 不变量理论那一课的概念入口(不必通读)。
- **Jürgen Richter-Gebert, _Perspectives on Projective Geometry_ (Springer, 2011)** — 射影几何的现代综合+算法视角,配图极好。

### 连续 / 李 / 通向物理

- **S. Katok, _Lectures on Lie Groups and Lie Algebras_ (Cambridge, 2023 再版)** — 本科级李论;矩阵群出发,不先要流形。
- **John Baez, "This Week's Finds in Mathematical Physics" 第 249 周** [math.ucr.edu](https://math.ucr.edu/home/baez/week249.html) 及 [Erlangen 页](https://math.ucr.edu/home/baez/erlangen/) — 把爱尔兰根纲领接到规范场/物理的优质科普桥梁。

### 教学法(目标 = 教大学)

- Artin / Stillwell 本身即教学范本;每课"如何讲"对照它们的处理。
- 讲法对位:用户在 `../geometry/` 的科普讲义可作"直觉层"对照(只取思想,不复用内容)。

## Olympiad(竞赛联结:真实试炼 + 题库)

- ✅ **Evan Chen, _Euclidean Geometry in Mathematical Olympiads_ (MAA, 2016)**
  现代 IMO 几何的事实标准。系统讲变换(平移/旋转/反射/位似)、**反演**、**旋转相似(spiral similarity)**、调和、复数法。何时翻:几乎每一章的"竞赛联结"对位读物。
- ✅ **《几何变换》(数学奥林匹克小丛书 · 高中卷)**
  中文系统教材:平移、中心反射、旋转、轴反射、位似、位似旋转、反演,配真题与历史名题。何时翻:中文取材与习题。
- **沈文选《平面几何证明方法全书》** — 中文经典,方法齐全。何时翻:找中文真题与一题多解。
- **张景中《平面几何新路》/《几何新路》** — 面积法、消点法,改革视角。何时翻:讲"机械化"几何证明时。
- **H. S. M. Coxeter & S. Greitzer, _Geometry Revisited_ (MAA, 1967)** — 变换与反演的经典短篇,竞赛向。何时翻:精炼综述。
- ✅ **Skopenkov 等《Mathematics via Problems · Part 2 几何》(MCCME)**
  用户**已中译**(`../../mathcircle/mvp_geometry/`),该书引用 EGMO。何时翻:直接复用中文题库与表述。

## Wisdom(社区)

> 用户尚未表态是否加入社区;若需要"真世界试炼",候选:

- **Math Stack Exchange**([math.stackexchange.com](https://math.stackexchange.com)) — 概念澄清、证明复核;适合把自证贴出来求挑刺。
- **r/math** 与 **MathOverflow**(研究向,慎发本科题)。
- 本地:若有大学旁听/数学讨论班,适合把"我能讲清楚吗"拿去试讲。

## Gaps(暂缺,后续补)

- 一本**中文**本科教材的对位(便于用户教学时取材);待搜:项武义《几何学》、或国内本科"几何学"教材中用变换群组织者。
- 交互式"矩阵群探索器"组件:留待相应课时在 `assets/` 开发。
