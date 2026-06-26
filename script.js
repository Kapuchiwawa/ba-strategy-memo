// Firebaseから必要な機能を読み込む
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebaseの設定
const firebaseConfig = {
  apiKey: "AIzaSyAnYQfgnTjdOp8uknYemon2BwCdaC8LB6o",
  authDomain: "ba-strategy-memo-jp.firebaseapp.com",
  projectId: "ba-strategy-memo-jp",
  storageBucket: "ba-strategy-memo-jp.firebasestorage.app",
  messagingSenderId: "329667143154",
  appId: "1:329667143154:web:c674488e1866a4e651f76b"
};

// Firebaseを開始
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestoreの保存場所
const memosCollection = collection(db, "memos");

let memos = [];
let selectedCategory = "全部";
let selectedMemoId = null;
let editingMemoId = null;

const memoList = document.getElementById("memoList");
const memoTitle = document.getElementById("memoTitle");
const memoBody = document.getElementById("memoBody");
const categoryButtons = document.querySelectorAll(".category-button");

const titleInput = document.getElementById("titleInput");
const categoryInput = document.getElementById("categoryInput");
const bodyInput = document.getElementById("bodyInput");
const addMemoButton = document.getElementById("addMemoButton");
const editMemoButton = document.getElementById("editMemoButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const deleteMemoButton = document.getElementById("deleteMemoButton");

const openFormButton = document.getElementById("openFormButton");
const newMemoForm = document.querySelector(".new-memo-form");

function getTime(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  return new Date(value).getTime();
}

function openForm() {
  newMemoForm.classList.remove("hidden");
}

function closeForm() {
  newMemoForm.classList.add("hidden");
}

function showMemo(memoId) {
  const memo = memos.find((memo) => memo.id === memoId);

  if (!memo) {
    selectedMemoId = null;
    memoTitle.textContent = "メモがありません";
    memoBody.textContent = "このカテゴリには、まだメモがありません。";
    return;
  }

  selectedMemoId = memo.id;
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

  const filteredMemos = memos.filter((memo) => {
    return isMemoVisible(memo);
  });

  if (filteredMemos.length === 0) {
    selectedMemoId = null;
    memoTitle.textContent = "メモがありません";
    memoBody.textContent = "このカテゴリには、まだメモがありません。";
    return;
  }

  const selectedMemoIsVisible = filteredMemos.some((memo) => {
    return memo.id === selectedMemoId;
  });

  if (!selectedMemoIsVisible) {
    selectedMemoId = filteredMemos[0].id;
  }

  filteredMemos.forEach((memo) => {
    const li = document.createElement("li");

    li.className = "memo-item";
    li.textContent = memo.title;

    if (memo.id === editingMemoId) {
      li.classList.add("editing");
    }

    li.addEventListener("click", () => {
      showMemo(memo.id);
    });

    memoList.appendChild(li);
  });

  showMemo(selectedMemoId);
}

function startEditMemo() {
  if (selectedMemoId === null) {
    alert("編集するメモがありません");
    return;
  }

  const memo = memos.find((memo) => memo.id === selectedMemoId);

  if (!memo) {
    alert("メモが見つかりません");
    return;
  }

  editingMemoId = memo.id;

  titleInput.value = memo.title;
  categoryInput.value = memo.category;
  bodyInput.value = memo.body;

  addMemoButton.textContent = "更新";

  openForm();
  renderMemoList();
}

function cancelEdit() {
  editingMemoId = null;

  titleInput.value = "";
  bodyInput.value = "";

  addMemoButton.textContent = "追加";

  closeForm();
  renderMemoList();
}

async function addOrUpdateMemo() {
  const title = titleInput.value.trim();
  const category = categoryInput.value;
  const body = bodyInput.value;

  if (title === "") {
    alert("タイトルを入力してください");
    return;
  }

  if (editingMemoId !== null) {
    const memoRef = doc(db, "memos", editingMemoId);

    await updateDoc(memoRef, {
      title: title,
      category: category,
      body: body,
      updatedAt: serverTimestamp()
    });

    selectedMemoId = editingMemoId;
    editingMemoId = null;
    addMemoButton.textContent = "追加";
  } else {
    const docRef = await addDoc(memosCollection, {
      title: title,
      category: category,
      body: body,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    selectedMemoId = docRef.id;
  }

  titleInput.value = "";
  bodyInput.value = "";

  selectedCategory = category;
  updateCategoryButton();
  closeForm();
}

async function deleteSelectedMemo() {
  if (selectedMemoId === null) {
    alert("削除するメモがありません");
    return;
  }

  const memo = memos.find((memo) => memo.id === selectedMemoId);

  if (!memo) {
    alert("メモが見つかりません");
    return;
  }

  const result = confirm(`「${memo.title}」を削除しますか？`);

  if (result === false) {
    return;
  }

  await deleteDoc(doc(db, "memos", selectedMemoId));

  selectedMemoId = null;
  editingMemoId = null;

  titleInput.value = "";
  bodyInput.value = "";
  addMemoButton.textContent = "追加";

  closeForm();
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;

    updateCategoryButton();
    renderMemoList();
  });
});

openFormButton.addEventListener("click", () => {
  editingMemoId = null;

  titleInput.value = "";
  bodyInput.value = "";
  addMemoButton.textContent = "追加";

  openForm();
});

addMemoButton.addEventListener("click", async () => {
  try {
    await addOrUpdateMemo();
  } catch (error) {
    console.error(error);
    alert("メモの保存に失敗しました。Firestoreの設定やルールを確認してください。");
  }
});

editMemoButton.addEventListener("click", () => {
  startEditMemo();
});

cancelEditButton.addEventListener("click", () => {
  cancelEdit();
});

deleteMemoButton.addEventListener("click", async () => {
  try {
    await deleteSelectedMemo();
  } catch (error) {
    console.error(error);
    alert("メモの削除に失敗しました。Firestoreの設定やルールを確認してください。");
  }
});

// Firestoreのメモをリアルタイムで読み込む
onSnapshot(
  memosCollection,
  (snapshot) => {
    memos = snapshot.docs.map((document) => {
      return {
        id: document.id,
        ...document.data()
      };
    });

    memos.sort((a, b) => {
      return getTime(b.updatedAt) - getTime(a.updatedAt);
    });

    renderMemoList();
  },
  (error) => {
    console.error(error);
    memoTitle.textContent = "読み込みエラー";
    memoBody.textContent = "Firestoreからメモを読み込めませんでした。ルールやデータベース設定を確認してください。";
  }
);

updateCategoryButton();