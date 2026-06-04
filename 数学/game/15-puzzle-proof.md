# 15数字华容道的可解性：群论证明

## 第零部分：历史背景

### §1 谜题与问题

15数字华容道（15-puzzle）是一个在 4×4 方格棋盘上进行的滑块拼图。棋盘上放有 15 个标号为 1–15 的滑块和 1 个空格。唯一合法的操作是将空格与上下左右相邻的滑块交换位置。游戏的目标是通过一系列合法操作，将任意初始排列还原为标准状态：

```
 1   2   3   4
 5   6   7   8
 9  10  11  12
13  14  15   _
```

19 世纪 80 年代，美国谜题家 Sam Loyd 声称发明了 15-puzzle 并提出了一个著名的悬赏问题：从标准状态出发，只交换 14 和 15 的位置，能否通过合法操作将其复原？他为此悬赏 $1000（历史学家对 Loyd 的发明权以及悬赏的真实性多有质疑，但这不影响问题的数学意义）。

```
 1   2   3   4
 5   6   7   8
 9  10  11  12
13  15  14   _
```

答案是否定的。1879 年，数学家 William Woolsey Johnson 和 William E. Story 在 *American Journal of Mathematics* 上发表论文，首次给出了 15-puzzle 可解性的完整刻画：一个状态可解，当且仅当其对应的置换的奇偶性与空格位置满足一个简单的不变量条件。他们利用置换的奇偶性和空格的曼哈顿距离，证明了恰好有一半的状态是可解的。

本文用现代群论语言重构这一证明。


---

## 第一部分：群论基础

### §2 群的定义

**定义（群）**. 设 $G$ 是一个非空集合，$\cdot$ 是 $G$ 上的二元运算。称 $(G, \cdot)$ 为一个**群**，如果满足以下四条公理：

1. **封闭性**：对任意 $a, b \in G$，有 $a \cdot b \in G$。
2. **结合律**：对任意 $a, b, c \in G$，有 $(a \cdot b) \cdot c = a \cdot (b \cdot c)$。
3. **单位元**：存在 $e \in G$，使得对任意 $a \in G$，有 $e \cdot a = a \cdot e = a$。
4. **逆元**：对任意 $a \in G$，存在 $b \in G$，使得 $a \cdot b = b \cdot a = e$。这个 $b$ 称为 $a$ 的逆元，记作 $a^{-1}$。

若群 $G$ 还满足交换律（对任意 $a, b \in G$，$a \cdot b = b \cdot a$），则称 $G$ 为**阿贝尔群**（或交换群）。

**例**.

- 整数集 $\mathbb{Z}$ 在加法下构成阿贝尔群 $(\mathbb{Z}, +)$，单位元为 $0$，$a$ 的逆元为 $-a$。
- 模 $n$ 剩余类 $\mathbb{Z}/n\mathbb{Z}$ 在模 $n$ 加法下构成有限阿贝尔群，单位元为 $\overline{0}$。

**定义（子群）**. 设 $(G, \cdot)$ 是群，$H \subseteq G$ 是非空子集。若 $H$ 在 $G$ 的运算下也构成群，则称 $H$ 是 $G$ 的**子群**，记作 $H \leq G$。


### §3 置换与对称群

**定义（置换）**. 设 $X = \{1, 2, \ldots, n\}$ 是有限集合。$X$ 到自身的**置换**是指 $X$ 上的一个双射（一一对应）$\sigma: X \to X$。

**定义（对称群）**. $X = \{1, 2, \ldots, n\}$ 上全体置换在复合运算下构成的群称为 $n$ 次**对称群**，记作 $S_n$。$S_n$ 的阶（元素个数）为 $n!$。

**复合运算约定**：全文采用**右复合**，即 $\sigma\tau$ 表示先作用 $\tau$、再作用 $\sigma$。确切地说，$(\sigma\tau)(i) = \sigma(\tau(i))$。

> **例**：设 $\sigma = (1\ 2)$，$\tau = (2\ 3)$，则 $\sigma\tau$ 先执行 $\tau$（交换 2 和 3）、再执行 $\sigma$（交换 1 和 2）：
> - $\sigma\tau(1) = \sigma(\tau(1)) = \sigma(1) = 2$；
> - $\sigma\tau(2) = \sigma(\tau(2)) = \sigma(3) = 3$；
> - $\sigma\tau(3) = \sigma(\tau(3)) = \sigma(2) = 1$。
>
> 故 $\sigma\tau = (1\ 2\ 3)$。注意 $\tau\sigma$ 的结果通常不同：$\tau\sigma = (1\ 3\ 2)$。

**置换的记号**.

- **双行记号**：$\sigma = \begin{pmatrix} 1 & 2 & 3 & 4 \\ 3 & 1 & 4 & 2 \end{pmatrix}$ 表示 $\sigma(1)=3, \sigma(2)=1, \sigma(3)=4, \sigma(4)=2$。
- **单行记号**：将上述置换写成 $3\,1\,4\,2$，即第 $i$ 个数就是 $\sigma(i)$。


### §4 轮换与轮换分解

**定义（轮换）**. 设 $\sigma \in S_n$。若存在互不相同的元素 $a_1, a_2, \ldots, a_k$（$k \geq 2$），使得

$$\sigma(a_1) = a_2,\ \sigma(a_2) = a_3,\ \ldots,\ \sigma(a_{k-1}) = a_k,\ \sigma(a_k) = a_1,$$

且 $\sigma$ 固定其余所有元素，则称 $\sigma$ 为一个长度为 $k$ 的**轮换**，记作 $(a_1\ a_2\ \ldots\ a_k)$。

长度为 2 的轮换称为**对换**，形如 $(a\ b)$，其效果是交换 $a$ 和 $b$ 并固定其余元素。

**定义（不相交）**. 两个轮换称为**不相交**的，如果它们涉及的元素集合没有公共元素。

**定理 4.1**. 任意置换 $\sigma \in S_n$ 可以（不计轮换顺序和循环移位地唯一）分解为不相交轮换的乘积。

*证明*. 对每个 $i \in \{1, \ldots, n\}$，追踪其**轨道**：

$$i \to \sigma(i) \to \sigma^2(i) \to \cdots$$

由于 $X$ 有限，轨道必然循环回到 $i$。不同元素的轨道要么完全相同，要么不相交。每个长度 $\geq 2$ 的轨道给出一个轮换，固定点（$\sigma(i)=i$）通常省略不写。$\square$

**例**. $\sigma = \begin{pmatrix}1&2&3&4&5\\3&1&5&4&2\end{pmatrix}$ 的轨道为：$1 \to 3 \to 5 \to 2 \to 1$（一个 4-轮换），$4 \to 4$（固定点）。故 $\sigma = (1\ 3\ 5\ 2)$。

**定理 4.2**. 不相交的轮换可交换。

*证明*. 设 $\alpha = (a_1\ \ldots\ a_k)$ 和 $\beta = (b_1\ \ldots\ b_l)$ 不相交。对任意 $i$：若 $i \notin \{a_1,\ldots,a_k,b_1,\ldots,b_l\}$，则 $\alpha\beta(i) = i = \beta\alpha(i)$。若 $i = a_j$，则 $\beta$ 固定 $i$，$\alpha\beta(i) = \alpha(i) = a_{j+1}$，而 $\beta\alpha(i) = \beta(a_{j+1}) = a_{j+1}$（因为 $a_{j+1}$ 也不在 $\beta$ 中）。$b$ 类似。$\square$


### §5 对换分解

**定理 5.1**. 任意 $k$-轮换 $(a_1\ a_2\ \ldots\ a_k)$（$k \geq 2$）可以写成 $k-1$ 个对换的乘积：

$$(a_1\ a_2\ \ldots\ a_k) = (a_1\ a_k)(a_1\ a_{k-1}) \cdots (a_1\ a_2)$$

*证明*. 记 $\tau = (a_1\ a_k)(a_1\ a_{k-1}) \cdots (a_1\ a_2)$。在右复合下，先执行最右边的 $(a_1\ a_2)$，再逐步向左。验证每个元素的去向。

- 若 $x = a_1$：依次经过 $(a_1\ a_2)$ 后变为 $a_2$，此后 $a_2$ 不再被后续对换涉及（后续对换只涉及 $a_1, a_3, a_4, \ldots, a_k$），故最终 $\tau(a_1) = a_2$。
- 若 $x = a_j$（$2 \leq j \leq k-1$）：$x$ 先被各对换传递——它在 $(a_1\ a_j)$ 之前不受影响（各对换只交换 $a_1$ 和 $a_m$），被 $(a_1\ a_j)$ 换成 $a_1$，此后被 $(a_1\ a_{j+1})$ 换成 $a_{j+1}$，之后不再受影响。故 $\tau(a_j) = a_{j+1}$。
- 若 $x = a_k$：它被 $(a_1\ a_k)$ 换成 $a_1$，之后不再受影响。故 $\tau(a_k) = a_1$。
- 若 $x \notin \{a_1, \ldots, a_k\}$：所有对换都固定 $x$。

这与 $(a_1\ a_2\ \ldots\ a_k)$ 的效果完全一致。$\square$

**推论 5.2**. $S_n$ 中的每个置换都可以写成有限个对换的乘积。

*证明*. 由定理 4.1，任意置换可分解为不相交轮换的乘积。由定理 5.1，每个轮换又可分解为对换的乘积。$\square$


### §6 逆序数与置换的奇偶性

一个置换的对换分解不是唯一的（例如 $(1\ 2) = (1\ 3)(2\ 3)(1\ 3)$），但本节将证明：对换个数的**奇偶性**是不变的。这是整个证明的理论基石。

**定义（逆序数）**. 设 $\sigma \in S_n$，将其写成单行记号 $\sigma(1)\,\sigma(2)\,\cdots\,\sigma(n)$。$\sigma$ 的**逆序数**定义为

$$\operatorname{inv}(\sigma) = \#\{(i,j) : 1 \leq i < j \leq n,\ \sigma(i) > \sigma(j)\}.$$

即前面位置的数大于后面位置的数所构成的对数。

**例**. $\sigma = (3\ 1\ 2)$（单行记号 $3\,1\,2$）。逆序对为 $(3,1)$ 和 $(3,2)$，共 2 个，故 $\operatorname{inv}(\sigma) = 2$。

**引理 6.1**. 在一个排列（单行记号）中交换任意两个位置的元素，逆序数的奇偶性改变。

等价地：若 $\tau = (a\ b)$，则 $\operatorname{inv}(\sigma\tau)$ 与 $\operatorname{inv}(\sigma)$ 的奇偶性不同。

*证明*. 在排列 $u_1 u_2 \cdots u_n$ 中交换第 $p$ 个和第 $q$ 个位置的元素（$p < q$），设交换前 $u_p = x$，$u_q = y$。分析所有数对 $(i, j)$（$i < j$）的逆序关系变化，分三类：

**第一类**：$\{i, j\} \cap \{p, q\} = \varnothing$。这两个位置的值未被交换，逆序关系不变。

**第二类**：$i = p$，$p < j < q$；或 $p < i < q$，$j = q$。对每个中间位置 $j$（$p < j < q$），设 $u_j = w$。交换前后，$(p, j)$ 和 $(j, q)$ 这两对的比较对象发生了交换：

- $(p, j)$：交换前比较 $x$ 与 $w$，交换后比较 $y$ 与 $w$。
- $(j, q)$：交换前比较 $w$ 与 $y$，交换后比较 $w$ 与 $x$。

这两对的变化相互耦合：$(p, j)$ 和 $(j, q)$ 交换了各自的比较对象。因此要么两对都不翻转，要么两对都翻转，每个中间元素 $j$ 贡献的变化量为偶数（0 或 2）。

中间元素的总贡献为偶数。

**第三类**：$(i, j) = (p, q)$。交换前比较 $x$ 与 $y$，交换后比较 $y$ 与 $x$。逆序性必然翻转，贡献变化量 1（奇数）。

**总计**：偶数 $+ 1 =$ 奇数。因此逆序数的奇偶性改变。

对于右复合 $\sigma\tau$（$\tau = (a\ b)$）：$\sigma\tau$ 将序列中位置 $a$ 和位置 $b$ 上的元素互换（即上述分析中 $p = a, q = b$ 的情形），这恰是引理所描述的操作。$\square$

**定理 6.2（奇偶性良定性）**. 设 $\sigma \in S_n$，若 $\sigma = \tau_1\tau_2\cdots\tau_r = \tau'_1\tau'_2\cdots\tau'_s$ 是两种对换分解，则 $r \equiv s \pmod{2}$。

*证明*. 恒等置换 $\operatorname{id}$ 的逆序数为 0（偶数）。将 $\sigma$ 进一步右复合 $\tau_r^{-1}\cdots\tau_1^{-1} = \tau_r\cdots\tau_1$（对换的逆是自身），得到 $\operatorname{id}$。此过程共施加 $r$ 次对换。由引理 6.1，每次对换改变逆序数的奇偶性，故 $\operatorname{inv}(\sigma)$ 与 $\operatorname{inv}(\operatorname{id}) = 0$ 相差 $r$ 的奇偶性，即 $\operatorname{inv}(\sigma) \equiv r \pmod{2}$。

同理 $\operatorname{inv}(\sigma) \equiv s \pmod{2}$。因此 $r \equiv s \pmod{2}$。$\square$

**定义（符号）**. 置换 $\sigma$ 的**符号**定义为

$$\operatorname{sgn}(\sigma) = (-1)^{\operatorname{inv}(\sigma)} = (-1)^r$$

其中 $r$ 是 $\sigma$ 的任意一种对换分解中对换的个数（定理 6.2 保证这与具体分解无关）。

- $\operatorname{sgn}(\sigma) = +1$ 称 $\sigma$ 为**偶置换**。
- $\operatorname{sgn}(\sigma) = -1$ 称 $\sigma$ 为**奇置换**。

**定理 6.3**. $\operatorname{sgn}: S_n \to \{+1, -1\}$ 是群同态，即 $\operatorname{sgn}(\sigma\tau) = \operatorname{sgn}(\sigma) \cdot \operatorname{sgn}(\tau)$。

*证明*. 设 $\sigma = \tau_1 \cdots \tau_r$，$\tau = \tau_{r+1} \cdots \tau_{r+s}$ 分别是对换分解。则 $\sigma\tau = \tau_1 \cdots \tau_{r+s}$ 是 $r+s$ 个对换的乘积，故 $\operatorname{sgn}(\sigma\tau) = (-1)^{r+s} = (-1)^r \cdot (-1)^s = \operatorname{sgn}(\sigma) \cdot \operatorname{sgn}(\tau)$。$\square$


### §7 交错群

**定义**. $n$ 次**交错群**定义为 $A_n = \{\sigma \in S_n : \operatorname{sgn}(\sigma) = +1\}$，即全体偶置换的集合。

**定理 7.1**. $A_n$ 是 $S_n$ 的子群。

*证明*. 由定理 6.3，$\operatorname{sgn}$ 是同态，$A_n = \ker(\operatorname{sgn})$。同态的核是子群。$\square$

**定理 7.2**. $A_n$ 是 $S_n$ 的正规子群，且 $[S_n : A_n] = 2$。

*证明*. 取任意一个奇置换，例如 $\tau = (1\ 2)$。$S_n$ 可分解为两个不相交的陪集：

$$S_n = A_n \cup \tau A_n$$

其中 $\tau A_n = \{\tau\sigma : \sigma \in A_n\}$ 是全体奇置换（因为 $\operatorname{sgn}(\tau\sigma) = -1 \cdot (+1) = -1$）。$A_n$ 与 $\tau A_n$ 不相交（前者为偶、后者为奇），且覆盖 $S_n$ 的所有元素。因此 $[S_n : A_n] = 2$。

任意指数为 2 的子群都是正规子群：设 $g \in S_n$，若 $g \in A_n$ 则 $gA_n = A_ng = A_n$；若 $g \notin A_n$ 则 $gA_n = \tau A_n = A_n g$（因为只有两个陪集）。$\square$

**推论 7.3**. $|A_n| = n!/2$。


### §8 $A_n$ 由 3-轮换生成

**定理 8.1**. 当 $n \geq 3$ 时，$A_n$ 由全体 3-轮换生成。即每个偶置换都可以写成若干个 3-轮换的乘积。

*证明*. 设 $\sigma \in A_n$。由推论 5.2，$\sigma$ 可以写成对换的乘积。因为 $\operatorname{sgn}(\sigma) = +1$，由定理 6.2，对换的个数必为偶数。将它们两两配对，只需证明**两个对换的乘积**可以写成 3-轮换的乘积。

设这两个对换为 $\alpha$ 和 $\beta$，分两种情况：

**情况 1**：$\alpha$ 与 $\beta$ 共享一个元素，即 $\alpha = (a\ b)$，$\beta = (a\ c)$，$a, b, c$ 互不相同。

验证 $(a\ c\ b)$ 的效果：$a \to c$，$c \to b$，$b \to a$。而 $\alpha\beta = (a\ b)(a\ c)$（右复合，先 $(a\ c)$ 再 $(a\ b)$）：

- $a$：先被 $(a\ c)$ 送到 $c$，再被 $(a\ b)$ 固定（$c \neq a, b$）$\to c$。
- $c$：先被 $(a\ c)$ 送到 $a$，再被 $(a\ b)$ 送到 $b$ $\to b$。
- $b$：先被 $(a\ c)$ 固定，再被 $(a\ b)$ 送到 $a$ $\to a$。

效果相同，故 $(a\ b)(a\ c) = (a\ c\ b)$，这是一个 3-轮换。

**情况 2**：$\alpha$ 与 $\beta$ 不共享元素，即 $\alpha = (a\ b)$，$\beta = (c\ d)$，$a, b, c, d$ 互不相同。

验证 $(a\ c\ b)(a\ c\ d)$。按右复合，先执行右边的 $(a\ c\ d)$，再执行左边的 $(a\ c\ b)$：

- $a$：$(a\ c\ d)$ 把 $a \to c$，$(a\ c\ b)$ 把 $c \to b$。结果 $a \to b$。
- $b$：$(a\ c\ d)$ 固定 $b$，$(a\ c\ b)$ 把 $b \to a$。结果 $b \to a$。
- $c$：$(a\ c\ d)$ 把 $c \to d$，$(a\ c\ b)$ 固定 $d$。结果 $c \to d$。
- $d$：$(a\ c\ d)$ 把 $d \to a$，$(a\ c\ b)$ 把 $a \to c$。结果 $d \to c$。

其余元素固定。因此 $(a\ c\ b)(a\ c\ d) = (a\ b)(c\ d)$，即两个不交对换的乘积等于两个 3-轮换的乘积。

综上，任意偶置换可写成 3-轮换的乘积。$\square$


---

## 第二部分：15-puzzle 的形式化建模

### §9 棋盘与状态编码

棋盘是一个 4×4 方格，共有 16 个位置。按行优先（从左到右、从上到下）编号为 1–16：

```
 1   2   3   4
 5   6   7   8
 9  10  11  12
13  14  15  16
```

15 个滑块分别标号 1–15，空格记为 16。

**编码约定**（全文统一）：一个棋盘状态用置换 $\sigma \in S_{16}$ 表示，其中 $\sigma(i)$ 等于位置 $i$ 上放置的内容。例如 $\sigma(5) = 7$ 表示第 5 号位置（第二行第一列）上放的是标号 7 的滑块。

**初始状态**（目标状态）：$\sigma_0 = \operatorname{id}$（恒等置换），即每个位置 $i$ 上放的是标号 $i$ 的内容（滑块 $1, \ldots, 15$ 各归其位，空格在位置 16）。

**相邻关系**：两个位置在棋盘上相邻，当且仅当它们的曼哈顿距离为 1。例如位置 6 与 $\{2, 5, 7, 10\}$ 相邻。

**合法操作**：若空格在位置 $p$，位置 $q$ 与 $p$ 相邻，则可以将空格与位置 $q$ 上的滑块交换。设交换前的状态为 $\sigma$，交换后的状态为 $\sigma'$，则位置 $p$ 和 $q$ 上的内容互换而其余不变：

$$\sigma'(p) = \sigma(q),\quad \sigma'(q) = \sigma(p),\quad \sigma'(i) = \sigma(i)\ \text{（其余）}$$

这恰好等于 $\sigma$ 与对换 $(p\ q)$ 的复合：

$$\sigma' = \sigma \circ (p\ q)$$

因为对任意 $i$，$(\sigma \circ (p\ q))(i) = \sigma((p\ q)(i))$：当 $i = p$ 时 $(p\ q)(p) = q$，故 $\sigma'(p) = \sigma(q)$；$i = q$ 类似。即在函数复合的意义下，先对输入位置施加对换，再查询原状态 $\sigma$，就得到了交换后新状态 $\sigma'$。

**目标**：给定任意状态 $\sigma$，判断是否存在合法操作序列将 $\sigma$ 还原为 $\sigma_0$（等价地，将 $\sigma_0$ 变为 $\sigma$）。若存在，称 $\sigma$ **可解**。


### §10 单次移动的奇偶性

每次合法操作右复合一个对换，因此由定理 6.3：

$$\operatorname{sgn}(\sigma') = \operatorname{sgn}(\sigma) \cdot \operatorname{sgn}((p\ q)) = -\operatorname{sgn}(\sigma)$$

每次移动翻转置换的符号。

同时，空格从一个位置移到相邻位置。设空格当前位置坐标为 $(\operatorname{row}, \operatorname{col})$（行、列均从 1 起编），则

$$\text{位置编号} = 4(\operatorname{row}-1) + \operatorname{col}$$

空格到右下角位置 16（坐标 $(4,4)$）的曼哈顿距离为

$$d = (4 - \operatorname{row}) + (4 - \operatorname{col})$$

每次移动使空格坐标的一个分量改变 $\pm 1$，因此 $d$ 也改变 $\pm 1$。


---

## 第三部分：核心不变量与可解性判定

### §11 不变量定理（必要性）

**定理 11.1**. 设 $\sigma$ 是从初始状态 $\sigma_0$ 出发经合法操作序列到达的状态，$p$ 是空格当前位置，$d(p)$ 是 $p$ 到位置 16 的曼哈顿距离。则

$$\operatorname{sgn}(\sigma) \cdot (-1)^{d(p)} = +1$$

*证明*. 对操作步数做数学归纳。

**基础**：初始状态 $\sigma_0 = \operatorname{id}$，$\operatorname{sgn}(\operatorname{id}) = +1$，空格在位置 16，$d = 0$。乘积 $= (+1)(+1) = +1$。成立。

**归纳步**：设当前状态 $\sigma$ 满足 $\operatorname{sgn}(\sigma) \cdot (-1)^{d(p)} = +1$。执行一次合法操作：空格从位置 $p$ 移到相邻位置 $q$，新状态 $\sigma' = \sigma \circ (p\ q)$。

- $\operatorname{sgn}(\sigma') = -\operatorname{sgn}(\sigma)$（§10）。
- $d(q) = d(p) \pm 1$（空格移了一格），故 $(-1)^{d(q)} = -(-1)^{d(p)}$。

因此

$$\operatorname{sgn}(\sigma') \cdot (-1)^{d(q)} = (-\operatorname{sgn}(\sigma)) \cdot (-(-1)^{d(p)}) = \operatorname{sgn}(\sigma) \cdot (-1)^{d(p)} = +1$$

不变量保持。$\square$

**推论 11.2**. 若 $\operatorname{sgn}(\sigma) \cdot (-1)^{d(p)} = -1$，则 $\sigma$ 不可解。


### §12 可解性的充要条件（充分性）

**定理 12.1**. 满足 $\operatorname{sgn}(\sigma) \cdot (-1)^{d(p)} = +1$ 的状态 $\sigma$ 均可解。

这一定理的证明是本文的核心。

**第一步：归约到空格在位置 16 的情形。**

设 $\sigma$ 满足不变量条件，空格在位置 $p$。任选一条从 $p$ 到位置 16 的棋盘路径 $p = p_0, p_1, \ldots, p_m = 16$（相邻步），将空格沿此路径移动到位置 16。设经过 $m$ 步后到达状态 $\tilde\sigma$。

每步右复合一个对换，故 $\operatorname{sgn}(\tilde\sigma) = (-1)^m \operatorname{sgn}(\sigma)$。同时空格到达位置 16，$d = 0$，$(-1)^{d} = 1$。不变量条件给出

$$\operatorname{sgn}(\tilde\sigma) = (-1)^m \operatorname{sgn}(\sigma) = (-1)^m \cdot (-1)^{d(p)} = (-1)^{m + d(p)}$$

空格从 $p$ 走到 16，路径长度 $m$ 与曼哈顿距离 $d(p)$ 的奇偶性相同（沿最短路径 $m = d(p)$；绕路则多走偶数步，奇偶性不变），故 $m \equiv d(p) \pmod{2}$。因此 $\operatorname{sgn}(\tilde\sigma) = +1$，即 $\tilde\sigma$ 是偶置换。

于是，只需证明：

> **归约命题**：空格在位置 16 时，任意满足 $\sigma(16)=16$ 的偶置换 $\sigma$ 都可以通过合法操作实现。由于 $\sigma(16)=16$，$\sigma$ 将 $\{1,\ldots,15\}$ 映射到自身，其限制是 $S_{15}$ 中的一个置换，且符号不变（因为固定点不影响符号），故 $\sigma$ 限制在 $\{1,\ldots,15\}$ 上为偶置换。

设 $G$ 为空格在位置 16 时所有可实现的置换的集合。$G$ 是 $S_{16}$ 的一个子群（因为两条以位置 16 为起止的操作序列可以首尾相接，逆操作也存在）。

由不变量（推论 11.2），$G \subseteq \{\sigma \in S_{16} : \sigma(16)=16,\ \operatorname{sgn}(\sigma)=+1\}$，后者同构于 $A_{15}$。以下证明 $G \supseteq A_{15}$。

**第二步：空格路径引理。**

**引理 12.2（空格自由移动）**. 空格可以从位置 16 出发，沿棋盘中任意一条路径移动到任意目标位置，沿途经过的位置上的滑块按相反方向移动一格（即被"推着走"）。空格经过的整条路径上的滑块发生了循环移位，而路径外的所有滑块保持不变。特别地，若空格最终回到位置 16，则操作序列实现的置换是路径上所有滑块的一个轮换，其长度等于路径经过的位置数。

*说明*. 这是因为每次移动都是空格与相邻滑块交换。空格沿路径依次走过 $p_0=16, p_1, p_2, \ldots, p_m$，则在置换层面等价于对换的复合 $(p_{m-1}\ p_m)(p_{m-2}\ p_{m-1})\cdots(p_0\ p_1)$。若 $p_m = 16$，则这是一个 $m$-轮换。

**第三步：2×2 方块技巧。**

**引理 12.3**. 考虑棋盘上任意一个 2×2 方块，其四个位置中有三个放有滑块 $A, B, C$，一个为空格。空格沿该方块逆时针绕行一圈（4 步移动），效果是 $A, B, C$ 的一个 3-轮换。空格回到原来的位置。

*证明*. 用右下角 2×2 方块 $\{11, 12, 15, 16\}$ 具体验证。设空格在位置 16，位置 11 放滑块 $A$，位置 12 放 $B$，位置 15 放 $C$。

初始状态：
```
A   B
C   _
```

（位置 11 = $A$，位置 12 = $B$，位置 15 = $C$，位置 16 = 空格）

**第 1 步**：空格向左移（交换位置 15, 16）。
```
A   B
_   C
```

**第 2 步**：空格向上移（交换位置 11, 15）。
```
_   B
A   C
```

**第 3 步**：空格向右移（交换位置 11, 12）。
```
B   _
A   C
```

**第 4 步**：空格向下移（交换位置 12, 16）。
```
B   C
A   _
```

最终状态：位置 11 = $B$，位置 12 = $C$，位置 15 = $A$，位置 16 = 空格。空格回到了位置 16。

三个滑块的轮换效果：$A$（原在 11）→ 位置 15，$B$（原在 12）→ 位置 11，$C$（原在 15）→ 位置 12。

这恰好是 3-轮换 $(A\ B\ C) = (11\ 12\ 15)$（在位置层面）。

对于棋盘上的任意 2×2 方块，同样的绕行产生类似效果。顺时针绕行则给出逆向的 3-轮换。$\square$

**第四步：实现任意 3-轮换。**

**引理 12.4**. 设 $a, b, c$ 是 $\{1, \ldots, 15\}$ 中三个互不相同的位置。则 3-轮换（在位置层面）$(a\ b\ c)$ 可以通过合法操作实现（空格出发和结束都在位置 16）。

*证明*. 如果 $a, b, c$ 已经属于同一个 2×2 方块，则直接由引理 12.3 实现。

一般情况下，思路是：先用空格将位置 $a, b, c$ 上的滑块逐一"搬运"到某个固定的 2×2 方块中，在该方块中做 3-轮换，再按逆序搬回。具体地：

1. 选择一个 2×2 方块 $B$（例如 $\{9, 10, 13, 14\}$，即左下角的方块）。由引理 12.2，空格可以从位置 16 出发到达任意位置。
2. 将位置 $a$ 上的滑块搬入 $B$：空格沿一条路径从位置 16 走到 $a$，然后通过一系列相邻交换将该滑块"推"到 $B$ 中。这一过程不改变 $B$ 以外的其他滑块（滑块仅沿路径依次移位，路径外滑块不受影响）。将这段操作记为 $\rho_1$。结束时空格回到位置 16（可通过原路径返回实现）。
3. 同理，将位置 $b, c$ 上的滑块分别搬入 $B$ 的其余位置（操作序列 $\rho_2, \rho_3$），每次搬完后空格回到位置 16。
4. 在方块 $B$ 中用引理 12.3 执行 3-轮换（操作序列 $\omega$）。
5. 按逆序执行 $\rho_3^{-1}, \rho_2^{-1}, \rho_1^{-1}$ 将滑块搬回原位。

按右复合约定，操作的时间顺序为 $\rho_1, \rho_2, \rho_3, \omega, \rho_3^{-1}, \rho_2^{-1}, \rho_1^{-1}$（先执行的写在右边），因此总置换为

$$\rho_1^{-1}\, \rho_2^{-1}\, \rho_3^{-1}\ \omega\ \rho_3\, \rho_2\, \rho_1$$

搬入搬出的操作精确抵消（$\rho_i^{-1}$ 是 $\rho_i$ 中操作按逆序执行，每步取逆），$\omega$ 的 3-轮换效果被正确传递到原始位置 $a, b, c$ 上的滑块。最终空格回到位置 16。$\square$

**第五步：完成充分性证明。**

前面已在第 325 行定义了 $G$ 为空格在位置 16 时可实现的全体置换，且已知 $G$ 是 $S_{16}$ 的子群。现在完成论证：

- 由引理 12.4，$G$ 包含所有 3-轮换（限制在 $\{1, \ldots, 15\}$ 上）。
- 由定理 8.1，$A_{15}$ 由 3-轮换生成，故 $G \supseteq A_{15}$。
- 由推论 11.2，$G \subseteq A_{15}$。

因此 $G = A_{15}$。空格在位置 16 时，恰好全体偶置换可实现。

结合第一步的归约，定理 12.1 得证。$\square$


### §13 实用判定条件

定理 11.1 和 12.1 给出的条件涉及 16 元置换的符号和空格的曼哈顿距离。本节将其翻译为更实用的形式：只看 15 个滑块的排列和空格的行号。

**定义**. 从棋盘状态中按位置顺序 $1, 2, \ldots, 16$ 读出滑块编号，跳过空格所在位置，得到 $\{1, \ldots, 15\}$ 的一个排列 $\pi$。

设空格在位置 $k$（坐标为 $(\operatorname{row}, \operatorname{col})$），$\pi$ 的逆序数为 $\operatorname{inv}(\pi)$。

**引理 13.1**. $\operatorname{sgn}(\sigma) = (-1)^{16-k} \cdot \operatorname{sgn}(\pi)$。

*证明*. $\sigma$ 是 16 元置换，$\sigma(k) = 16$。从 $\sigma$ 的单行记号 $\sigma(1)\sigma(2)\cdots\sigma(16)$ 中删除第 $k$ 个元素（即 16）就得到 $\pi$ 的单行记号。

删除第 $k$ 个元素等价于将它与第 $k+1$ 个交换，再与第 $k+2$ 个交换，……，最终与第 16 个交换，共 $16 - k$ 次相邻对换。每次相邻对换改变逆序数的奇偶性，因此

$$\operatorname{inv}(\sigma) \equiv \operatorname{inv}(\pi) + (16 - k) \pmod{2}$$

从而 $\operatorname{sgn}(\sigma) = (-1)^{16-k} \cdot \operatorname{sgn}(\pi)$。$\square$

**定理 13.2**. 状态 $\sigma$ 可解当且仅当

$$\operatorname{inv}(\pi) + \operatorname{row} \text{ 为偶数}$$

其中 $\pi$ 是 15 个滑块按位置读出的排列，$\operatorname{row}$ 是空格所在行号（从上起，1-indexed）。

*证明*. 由定理 11.1 和 12.1，$\sigma$ 可解当且仅当 $\operatorname{sgn}(\sigma) = (-1)^{d(p)}$，其中 $d(p) = (4-\operatorname{row}) + (4-\operatorname{col})$。

由引理 13.1：

$$(-1)^{16-k} \cdot \operatorname{sgn}(\pi) = (-1)^{d(p)}$$

即 $\operatorname{sgn}(\pi) = (-1)^{d(p) - (16-k)} = (-1)^{d(p) + k}$（因为 $(-1)^{-n} = (-1)^n$）。

代入 $k = 4(\operatorname{row}-1) + \operatorname{col}$ 和 $d(p) = 8 - \operatorname{row} - \operatorname{col}$：

$$d(p) + k = (8 - \operatorname{row} - \operatorname{col}) + (4\operatorname{row} - 4 + \operatorname{col}) = 4 + 3\operatorname{row}$$

因此 $\operatorname{sgn}(\pi) = (-1)^{4+3\operatorname{row}} = (-1)^{3\operatorname{row}}$（因为 $(-1)^4 = 1$）。

而 $(-1)^{3\operatorname{row}} = (-1)^{\operatorname{row}}$（因为 $3$ 是奇数）。

所以 $\operatorname{sgn}(\pi) = (-1)^{\operatorname{row}}$，即 $\operatorname{inv}(\pi)$ 与 $\operatorname{row}$ 的奇偶性相同，等价于 $\operatorname{inv}(\pi) + \operatorname{row}$ 为偶数。$\square$


### §14 经典反例

回到 §1 中的 14-15 问题。状态为：

```
 1   2   3   4
 5   6   7   8
 9  10  11  12
13  15  14   _
```

- 按位置读出（跳过位置 16）：$1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14$。
- 逆序对只有 $(15, 14)$，$\operatorname{inv}(\pi) = 1$。
- 空格在位置 16，第 4 行，$\operatorname{row} = 4$。
- $\operatorname{inv}(\pi) + \operatorname{row} = 1 + 4 = 5$（奇数）。

由定理 13.2，此状态不可解。\$1000 的悬赏是安全的。

也可直接用 16 元置换看：$\sigma = (14\ 15)$，这是一个对换，$\operatorname{sgn}(\sigma) = -1$。空格在位置 16，$d = 0$。$\operatorname{sgn}(\sigma) \cdot (-1)^0 = -1 \neq +1$，由推论 11.2 不可解。


---

## 第四部分：总结与推广

### §15 定理的完整陈述

综合以上全部结果：

> **定理（15-puzzle 可解性）**. 设 $\sigma$ 是 15-puzzle 的一个棋盘状态，用 16 元置换编码。设 $p$ 为空格位置，$d(p)$ 为 $p$ 到位置 16 的曼哈顿距离。则 $\sigma$ 可解的充要条件是
>
> $$\operatorname{sgn}(\sigma) \cdot (-1)^{d(p)} = +1$$
>
> 等价地，若将 15 个滑块按位置顺序读出（跳过空格）得到排列 $\pi$，空格在第 $\operatorname{row}$ 行（从上起编），则 $\sigma$ 可解的充要条件是
>
> $$\operatorname{inv}(\pi) + \operatorname{row} \text{ 为偶数}$$

全体棋盘状态共 $16!$ 种（16 个位置排列 16 个对象）。由于可解的充要条件约束了符号与距离的奇偶性，可解状态恰好占一半——共 $16!/2$ 个。

> **直观总结**：判断一个 15-puzzle 状态是否可解，只需两步：
> 1. 按行优先顺序读出 15 个滑块的排列（跳过空格），数出逆序数的奇偶性；
> 2. 看空格在第几行（从上起，1-indexed）。
>
> 两者之和为偶数则可解，为奇数则不可解。


### §16 推广到 $m \times n$ 棋盘

上述论证可以推广到 $m \times n$（$m, n \geq 2$）的滑块拼图，共有 $mn - 1$ 个滑块和 1 个空格。

**不变量**：类似 §11 的论证仍然成立。每次移动同时翻转置换符号和空格距离奇偶性，因此 $\operatorname{sgn}(\sigma) \cdot (-1)^{d(p)} = +1$ 仍是必要条件，其中 $d(p)$ 是空格到右下角的曼哈顿距离。

**充分性**：2×2 方块技巧（引理 12.3）在任何 $m, n \geq 2$ 的棋盘上都可用，因此 3-轮换总可实现，充分性论证不变。

**判定条件的推导**：与 §13 类似，设棋盘宽度为 $n$，空格在位置 $k = n(\operatorname{row}-1) + \operatorname{col}$，$d = (m - \operatorname{row}) + (n - \operatorname{col})$。引理 13.1 推广为 $\operatorname{sgn}(\sigma) = (-1)^{mn - k} \cdot \operatorname{sgn}(\pi)$。代入不变量条件 $\operatorname{sgn}(\sigma) = (-1)^d$，得

$$\operatorname{sgn}(\pi) = (-1)^{d + k - mn}$$

计算指数：

$$d + k - mn = (m - \operatorname{row}) + (n - \operatorname{col}) + n(\operatorname{row} - 1) + \operatorname{col} - mn = (n+1)(\operatorname{row} - m)$$

因此

$$\operatorname{sgn}(\pi) = (-1)^{(n+1)(\operatorname{row} - m)}$$

由此得出两种情况：

- **$n$ 为偶数**：$n + 1$ 为奇数，$\operatorname{sgn}(\pi) = (-1)^{\operatorname{row} - m}$。由于 $m$（棋盘高度）是固定的常数，$(-1)^m$ 对全体状态一致，因此条件等价于 $\operatorname{inv}(\pi) + \operatorname{row}$ 的奇偶性与 $m$ 的奇偶性一致——但可解状态集合不依赖 $m$ 的具体值，只需要检查 $\operatorname{inv}(\pi) + \operatorname{row}$ 的奇偶性即可。

- **$n$ 为奇数**：$n + 1$ 为偶数，$(-1)^{(n+1)(\operatorname{row}-m)} = 1$。因此 $\operatorname{sgn}(\pi) = +1$，条件与空格所在行无关——此时不变量退化为只约束排列 $\pi$ 本身必须是偶置换，空格的位置不再独立起作用。

总结：

$$\text{状态可解} \iff \begin{cases} \operatorname{inv}(\pi) + \operatorname{row} \text{ 为偶数} & \text{若棋盘宽度 } n \text{ 为偶数} \\ \operatorname{inv}(\pi) \text{ 为偶数} & \text{若棋盘宽度 } n \text{ 为奇数} \end{cases}$$

对于经典的 8-puzzle（$3 \times 3$）：$n = 3$ 为奇数，可解条件就是 $\pi$ 为偶排列。
