const STORAGE_KEY = "baStrategyMemos";

const defaultMemos = [
  {
    title: "ビナー Insane",
    category: "総力戦",
    body: `ここにビナーの攻略メモを書く。

例：
8 ツバキ
10 ホシノ
すぐバフ`
  },
  {
    title: "セト 神秘",
    category: "制約解除",
    body: `ここにセトの攻略メモを書く。

例：
03:56 マリー
03:10 ケイ死亡待機
02:55 赤玉前にケイ`
  },
  {
    title: "山海経 夏イベChallenge",
    category: "イベント",
    body: `ここにイベントChallengeのメモを書く。

例：
ユウカ セリカ マリー ハナコ
キサキ→ヒナ`
  }
];

let memos = loadMemos();
let selectedCategory = "全部";
let selectedMemoIndex = 0;
let editingMemoIndex = null;

const memoList = document.getElementById("memoList");
const memoTitle = document.getElementById("memoTitle");
const memoBody = document.getElementById("memoBody");
const categoryButtons = document.querySelectorAll(".category-button");

const titleInput = document.getElementById("titleInput");
const categoryInput = document.getElementById("categoryInput");
const bodyInput = document.getElementById("bodyInput");
const addMemoButton = document.getElementById("addMemoButton");

const openFormButton = document.getElementById("openFormButton");
const newMemoForm = document.querySelector(".new-memo-form");

const editMemoButton = document.getElementById("editMemoButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const deleteMemoButton = document.getElementById("deleteMemoButton");

function loadMemos() {
  const savedMemos = localStorage.getItem(STORAGE_KEY);

  if (savedMemos === null) {
    return defaultMemos;
  }

  return JSON.parse(savedMemos);
}

function saveMemos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

function showMemo(index) {
  const memo = memos[index];

  selectedMemoIndex = index;
  memoTitle.textContent = memo.title;
  memoBody.textContent = memo.body;
}

function updateCategoryButton() {
  categoryButtons.forEach((button) => {
    button.classList.remove("active");

    if (button.dataset.category === selectedCategory) {
      button.classList.add("active");
    }
  });
}

function isMemoVisible(memo) {
  if (selectedCategory === "全部") {
    return true;
  }

  return memo.category === selectedCategory;
}

function renderMemoList() {
  memoList.innerHTML = "";

  let firstVisibleIndex = null;

  memos.forEach((memo, index) => {
    if (!isMemoVisible(memo)) {
      return;
    }

    if (firstVisibleIndex === null) {
      firstVisibleIndex = index;
    }

    const li = document.createElement("li");

    li.className = "memo-item";
    li.textContent = memo.title;

    if (index === editingMemoIndex) {
      li.classList.add("editing");
    }

    li.addEventListener("click", () => {
      showMemo(index);
    });

    memoList.appendChild(li);
  });

    if (firstVisibleIndex !== null) {
    showMemo(firstVisibleIndex);
  } else {
    selectedMemoIndex = null;
    memoTitle.textContent = "メモがありません";
    memoBody.textContent = "このカテゴリには、まだメモがありません。";
  }
}

function startEditMemo() {
  const memo = memos[selectedMemoIndex];

  editingMemoIndex = selectedMemoIndex;

  titleInput.value = memo.title;
  categoryInput.value = memo.category;
  bodyInput.value = memo.body;

  addMemoButton.textContent = "更新";

  openForm();
  renderMemoList();
}

function cancelEdit() {
  editingMemoIndex = null;

  titleInput.value = "";
  bodyInput.value = "";

  addMemoButton.textContent = "追加";

  closeForm();
  renderMemoList();
}

function openForm() {
  newMemoForm.classList.remove("hidden");
}

function closeForm() {
  newMemoForm.classList.add("hidden");
}

function deleteSelectedMemo() {
  if (selectedMemoIndex === null) {
    alert("削除するメモがありません");
    return;
  }

  const memo = memos[selectedMemoIndex];

  const result = confirm(`「${memo.title}」を削除しますか？`);

  if (result === false) {
    return;
  }

  memos.splice(selectedMemoIndex, 1);
  saveMemos();

  editingMemoIndex = null;
  titleInput.value = "";
  bodyInput.value = "";
  addMemoButton.textContent = "追加";

  if (selectedMemoIndex >= memos.length) {
    selectedMemoIndex = memos.length - 1;
  }

  renderMemoList();
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;

    updateCategoryButton();
    renderMemoList();
  });
});

addMemoButton.addEventListener("click", () => {
  const title = titleInput.value.trim();
  const category = categoryInput.value;
  const body = bodyInput.value;

  if (title === "") {
    alert("タイトルを入力してください");
    return;
  }

  if (editingMemoIndex !== null) {
    memos[editingMemoIndex] = {
      title: title,
      category: category,
      body: body
    };

    selectedMemoIndex = editingMemoIndex;
    editingMemoIndex = null;
    addMemoButton.textContent = "追加";
  } else {
    const newMemo = {
      title: title,
      category: category,
      body: body
    };

    memos.push(newMemo);
    selectedMemoIndex = memos.length - 1;
  }

  saveMemos();

  titleInput.value = "";
  bodyInput.value = "";

  selectedCategory = category;
  updateCategoryButton();
  renderMemoList();
  showMemo(selectedMemoIndex);
  closeForm();
});

editMemoButton.addEventListener("click", () => {
  startEditMemo();
});

cancelEditButton.addEventListener("click", () => {
  cancelEdit();
});

deleteMemoButton.addEventListener("click", () => {
  deleteSelectedMemo();
});

openFormButton.addEventListener("click", () => {
  editingMemoIndex = null;

  titleInput.value = "";
  bodyInput.value = "";
  addMemoButton.textContent = "追加";

  openForm();
});

updateCategoryButton();
renderMemoList();