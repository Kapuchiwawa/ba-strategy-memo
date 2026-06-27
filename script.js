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

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let memos = [];
let selectedCategory = "全部";
let selectedMemoId = null;
let editingMemoId = null;
let currentUser = null;
let unsubscribeMemos = null;

let currentSort = localStorage.getItem("memoSort") || "manual";

let isReorderMode = false;
let draggedMemoId = null;

let placeholderElement = null;

const memoList = document.getElementById("memoList");
const memoTitle = document.getElementById("memoTitle");
const memoBody = document.getElementById("memoBody");
const categoryButtons = document.querySelectorAll(".category-button");

const titleInput = document.getElementById("titleInput");
const groupInput = document.getElementById("groupInput");
const categoryCheckboxes = document.querySelectorAll(".category-checkbox");
const bodyInput = document.getElementById("bodyInput");
const addMemoButton = document.getElementById("addMemoButton");
const editMemoButton = document.getElementById("editMemoButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const deleteMemoButton = document.getElementById("deleteMemoButton");

const openFormButton = document.getElementById("openFormButton");
const newMemoForm = document.querySelector(".new-memo-form");

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const userName = document.getElementById("userName");

const sortSelect = document.getElementById("sortSelect");
const reorderButton = document.getElementById("reorderButton");
const finishReorderButton = document.getElementById("finishReorderButton");

sortSelect.value = currentSort;

function getTimeValue(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  return new Date(value).getTime() || 0;
}

function sortMemos(memosToSort) {
  const sortedMemos = [...memosToSort];

  sortedMemos.sort((a, b) => {
    if (currentSort === "manual") {
      const orderA = a.sortOrder ?? getTimeValue(a.createdAt);
      const orderB = b.sortOrder ?? getTimeValue(b.createdAt);
      return orderA - orderB;
    }

    if (currentSort === "updatedDesc") {
      return getTimeValue(b.updatedAt) - getTimeValue(a.updatedAt);
    }

    if (currentSort === "createdDesc") {
      return getTimeValue(b.createdAt) - getTimeValue(a.createdAt);
    }

    if (currentSort === "titleAsc") {
      return String(a.title || "").localeCompare(String(b.title || ""), "ja");
    }

    return 0;
  });

  return sortedMemos;
}

function getMemoCategories(memo) {
  if (Array.isArray(memo.categories)) {
    return memo.categories;
  }

  if (memo.category) {
    return [memo.category];
  }

  return [];
}

function getMemoGroup(memo) {
  return String(memo.group || "").trim();
}

function getSelectedCategories() {
  return Array.from(categoryCheckboxes)
    .filter((checkbox) => {
      return checkbox.checked;
    })
    .map((checkbox) => {
      return checkbox.value;
    });
}

function setSelectedCategories(categories) {
  categoryCheckboxes.forEach((checkbox) => {
    checkbox.checked = categories.includes(checkbox.value);
  });
}

function clearMemoForm() {
  titleInput.value = "";
  groupInput.value = "";
  bodyInput.value = "";
  setSelectedCategories([]);
}

// ログイン中のユーザー専用のメモ保存場所
function getMemosCollection() {
  return collection(db, "users", currentUser.uid, "memos");
}

function openForm() {
  if (!currentUser) {
    alert("先にGoogleでログインしてください");
    return;
  }

  newMemoForm.classList.remove("hidden");
}

function closeForm() {
  newMemoForm.classList.add("hidden");
}

function showLoginMessage() {
  memoList.innerHTML = "";
  memoTitle.textContent = "ログインしてください";
  memoBody.textContent = "Googleでログインすると、PCとスマホで同じメモを使えます。";
}

function showMemo(memoId) {
  const memo = memos.find((memo) => {
    return memo.id === memoId;
  });

  if (!memo) {
    selectedMemoId = null;
    memoTitle.textContent = "メモがありません";
    memoBody.textContent = "このカテゴリには、まだメモがありません。";
    return;
  }

  const categories = getMemoCategories(memo);
  const groupName = getMemoGroup(memo);

  const groupText = groupName !== "" ? `グループ：${groupName}\n` : "";
  const categoryText = categories.length > 0 ? `項目：${categories.join(" / ")}\n\n` : "";

  selectedMemoId = memo.id;
  memoTitle.textContent = memo.title;
  memoBody.textContent = groupText + categoryText + memo.body;
}

function updateCategoryButton() {
  categoryButtons.forEach((button) => {
    button.classList.remove("active");

    if (button.dataset.category === selectedCategory) {
      button.classList.add("active");
    }
  });
}

function updateAuthUI() {
  if (currentUser) {
    userName.textContent = currentUser.displayName || currentUser.email || "ログイン中";

    loginButton.classList.add("hidden");
    logoutButton.classList.remove("hidden");

    openFormButton.disabled = false;
    editMemoButton.disabled = false;
    deleteMemoButton.disabled = false;
    addMemoButton.disabled = false;
  } else {
    userName.textContent = "未ログイン";

    loginButton.classList.remove("hidden");
    logoutButton.classList.add("hidden");

    openFormButton.disabled = true;
    editMemoButton.disabled = true;
    deleteMemoButton.disabled = true;
    addMemoButton.disabled = true;
  }
}

function isMemoVisible(memo) {
  if (selectedCategory === "全部") {
    return true;
  }

  return getMemoCategories(memo).includes(selectedCategory);
}

function renderMemoList() {
  if (!currentUser) {
    showLoginMessage();
    return;
  }

  memoList.innerHTML = "";

  const filteredMemos = memos.filter((memo) => {
    return isMemoVisible(memo);
  });

  const sortedMemos = sortMemos(filteredMemos);

  if (sortedMemos.length === 0) {
    selectedMemoId = null;
    memoTitle.textContent = "メモがありません";
    memoBody.textContent = "このカテゴリには、まだメモがありません。";
    return;
  }

  const selectedMemoIsVisible = sortedMemos.some((memo) => {
    return memo.id === selectedMemoId;
  });

  if (!selectedMemoIsVisible) {
    selectedMemoId = sortedMemos[0].id;
  }

  const groupedMemos = new Map();

  sortedMemos.forEach((memo) => {
    const groupName = getMemoGroup(memo);

    if (!groupedMemos.has(groupName)) {
      groupedMemos.set(groupName, []);
    }

    groupedMemos.get(groupName).push(memo);
  });

  groupedMemos.forEach((groupMemos, groupName) => {
    if (groupName !== "") {
      const groupTitle = document.createElement("li");

      groupTitle.className = "memo-group-title";
      groupTitle.textContent = groupName;

      memoList.appendChild(groupTitle);
    }

    groupMemos.forEach((memo) => {
      const li = document.createElement("li");
      const titleArea = document.createElement("span");

      li.className = "memo-item";
      li.dataset.memoId = memo.id;

      titleArea.className = "memo-item-title";
      titleArea.textContent = memo.title;
      li.appendChild(titleArea);

      if (isReorderMode && currentSort === "manual") {
        li.draggable = true;
        li.classList.add("reorder-mode");
      } else {
        li.draggable = false;
      }

      if (memo.id === editingMemoId) {
        li.classList.add("editing");
      }

      li.addEventListener("click", () => {
        if (isReorderMode) {
          return;
        }

        showMemo(memo.id);
      });

      li.addEventListener("dragstart", (event) => {
        if (!isReorderMode || currentSort !== "manual") {
          event.preventDefault();
          return;
        }

        draggedMemoId = memo.id;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", memo.id);

        li.classList.add("dragging");
      });

      li.addEventListener("dragend", () => {
        draggedMemoId = null;
        removePlaceholder();

        document.querySelectorAll(".memo-item.dragging").forEach((item) => {
          item.classList.remove("dragging");
        });
      });

      memoList.appendChild(li);
    });
  });

  showMemo(selectedMemoId);
}

function getPlaceholderElement() {
  if (!placeholderElement) {
    placeholderElement = document.createElement("li");
    placeholderElement.className = "drag-placeholder";
    placeholderElement.textContent = "ここに移動";
  }

  return placeholderElement;
}

function removePlaceholder() {
  if (placeholderElement && placeholderElement.parentNode) {
    placeholderElement.parentNode.removeChild(placeholderElement);
  }
}

function getDragAfterElement(container, y) {
  const draggableElements = Array.from(
    container.querySelectorAll(".memo-item:not(.dragging)")
  );

  const result = draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return {
          offset: offset,
          element: child
        };
      }

      return closest;
    },
    {
      offset: Number.NEGATIVE_INFINITY,
      element: null
    }
  );

  return result.element;
}

async function saveMemoOrderByIds(orderIds) {
  const visibleMemos = memos.filter((memo) => {
    return isMemoVisible(memo);
  });

  const sortedMemos = sortMemos(visibleMemos);

  if (orderIds.length !== sortedMemos.length) {
    return;
  }

  const memoMap = new Map();

  sortedMemos.forEach((memo) => {
    memoMap.set(memo.id, memo);
  });

  const baseOrder = Date.now();

  const orderValues = sortedMemos.map((memo, index) => {
    const currentOrder = memo.sortOrder ?? getTimeValue(memo.createdAt);

    if (currentOrder) {
      return currentOrder;
    }

    return baseOrder + index;
  });

  await Promise.all(
    orderIds.map((memoId, index) => {
      const memo = memoMap.get(memoId);

      if (!memo) {
        return Promise.resolve();
      }

      const newSortOrder = orderValues[index];

      memo.sortOrder = newSortOrder;

      return updateDoc(doc(db, "users", currentUser.uid, "memos", memoId), {
        sortOrder: newSortOrder
      });
    })
  );

  selectedMemoId = draggedMemoId;
  renderMemoList();
}

function startEditMemo() {
  if (!currentUser) {
    alert("先にGoogleでログインしてください");
    return;
  }

  if (selectedMemoId === null) {
    alert("編集するメモがありません");
    return;
  }

  const memo = memos.find((memo) => {
    return memo.id === selectedMemoId;
  });

  if (!memo) {
    alert("メモが見つかりません");
    return;
  }

  editingMemoId = memo.id;

  titleInput.value = memo.title;
  groupInput.value = memo.group || "";
  bodyInput.value = memo.body;
  setSelectedCategories(getMemoCategories(memo));

  addMemoButton.textContent = "更新";

  openForm();
  renderMemoList();
}

function cancelEdit() {
  editingMemoId = null;

  clearMemoForm();

  addMemoButton.textContent = "追加";

  closeForm();
  renderMemoList();
}

async function addOrUpdateMemo() {
  if (!currentUser) {
    alert("先にGoogleでログインしてください");
    return;
  }

  const title = titleInput.value.trim();
  const groupName = groupInput.value.trim();
  const categories = getSelectedCategories();
  const body = bodyInput.value;
  const primaryCategory = categories[0];

  if (title === "") {
    alert("タイトルを入力してください");
    return;
  }

  if (categories.length === 0) {
    alert("項目を1つ以上選んでください");
    return;
  }

  if (editingMemoId !== null) {
    const memoRef = doc(db, "users", currentUser.uid, "memos", editingMemoId);

    await updateDoc(memoRef, {
      title: title,
      group: groupName,
      category: primaryCategory,
      categories: categories,
      body: body,
      updatedAt: serverTimestamp()
    });

    selectedMemoId = editingMemoId;
    editingMemoId = null;
    addMemoButton.textContent = "追加";
  } else {
    const docRef = await addDoc(getMemosCollection(), {
      title: title,
      group: groupName,
      category: primaryCategory,
      categories: categories,
      body: body,
      sortOrder: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    selectedMemoId = docRef.id;
  }

  clearMemoForm();

  selectedCategory = primaryCategory;
  updateCategoryButton();
  closeForm();
}

async function deleteSelectedMemo() {
  if (!currentUser) {
    alert("先にGoogleでログインしてください");
    return;
  }

  if (selectedMemoId === null) {
    alert("削除するメモがありません");
    return;
  }

  const memo = memos.find((memo) => {
    return memo.id === selectedMemoId;
  });

  if (!memo) {
    alert("メモが見つかりません");
    return;
  }

  const result = confirm(`「${memo.title}」を削除しますか？`);

  if (result === false) {
    return;
  }

  await deleteDoc(doc(db, "users", currentUser.uid, "memos", selectedMemoId));

  selectedMemoId = null;
  editingMemoId = null;

  clearMemoForm();
  addMemoButton.textContent = "追加";

  closeForm();
}

function startMemoListener() {
  if (unsubscribeMemos) {
    unsubscribeMemos();
    unsubscribeMemos = null;
  }

  unsubscribeMemos = onSnapshot(
    getMemosCollection(),
    (snapshot) => {
      memos = snapshot.docs.map((document) => {
        return {
          id: document.id,
          ...document.data()
        };
      });

      renderMemoList();
    },
    (error) => {
      console.error(error);
      memoTitle.textContent = "読み込みエラー";
      memoBody.textContent = "Firestoreからメモを読み込めませんでした。ルールやログイン状態を確認してください。";
    }
  );
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;

    updateCategoryButton();
    renderMemoList();
  });
});

function updateReorderUI() {
  const isManualSort = currentSort === "manual";

  if (!isManualSort) {
    isReorderMode = false;
    draggedMemoId = null;
    removePlaceholder();

    reorderButton.classList.add("hidden");
    finishReorderButton.classList.add("hidden");
    sortSelect.disabled = false;
    return;
  }

  if (isReorderMode) {
    reorderButton.classList.add("hidden");
    finishReorderButton.classList.remove("hidden");
    sortSelect.disabled = true;
  } else {
    reorderButton.classList.remove("hidden");
    finishReorderButton.classList.add("hidden");
    sortSelect.disabled = false;
  }
}

function startReorderMode() {

  currentSort = "manual";
  localStorage.setItem("memoSort", currentSort);
  sortSelect.value = currentSort;

  isReorderMode = true;
  updateReorderUI();
  renderMemoList();

}

function finishReorderMode() {
  isReorderMode = false;
  draggedMemoId = null;

  updateReorderUI();
  renderMemoList();
}

sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value;
  localStorage.setItem("memoSort", currentSort);

  updateReorderUI();
  renderMemoList();
});

memoList.addEventListener("dragover", (event) => {
  if (!isReorderMode || currentSort !== "manual" || !draggedMemoId) {
    return;
  }

  event.preventDefault();

  const placeholder = getPlaceholderElement();
  const afterElement = getDragAfterElement(memoList, event.clientY);

  if (afterElement === null) {
    memoList.appendChild(placeholder);
  } else {
    memoList.insertBefore(placeholder, afterElement);
  }
});

memoList.addEventListener("drop", async (event) => {
  if (!isReorderMode || currentSort !== "manual" || !draggedMemoId) {
    return;
  }

  event.preventDefault();

  const placeholder = getPlaceholderElement();

  if (!placeholder.parentNode) {
    return;
  }

  const newOrderIds = Array.from(memoList.children).flatMap((child) => {
    if (child.classList.contains("drag-placeholder")) {
      return [draggedMemoId];
    }

    if (child.classList.contains("memo-item")) {
      const memoId = child.dataset.memoId;

      if (memoId && memoId !== draggedMemoId) {
        return [memoId];
      }
    }

    return [];
  });

  removePlaceholder();

  try {
    await saveMemoOrderByIds(newOrderIds);
  } catch (error) {
    console.error(error);
    alert("並び替えの保存に失敗しました。");
  }
});

reorderButton.addEventListener("click", () => {
  if (!currentUser) {
    alert("先にGoogleでログインしてください");
    return;
  }

  if (!currentUser) {
    alert("先にGoogleでログインしてください");
    return;
  }

  startReorderMode();
});

finishReorderButton.addEventListener("click", () => {
  finishReorderMode();
});

loginButton.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error(error);
    alert("Googleログインに失敗しました。Firebase Authenticationの設定を確認してください。");
  }
});

logoutButton.addEventListener("click", async () => {
  await signOut(auth);
});

openFormButton.addEventListener("click", () => {
  editingMemoId = null;

  clearMemoForm();

  if (selectedCategory !== "全部") {
    setSelectedCategories([selectedCategory]);
  }

  addMemoButton.textContent = "追加";

  openForm();
});

addMemoButton.addEventListener("click", async () => {
  try {
    await addOrUpdateMemo();
  } catch (error) {
    console.error(error);
    alert("メモの保存に失敗しました。Firestoreのルールを確認してください。");
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
    alert("メモの削除に失敗しました。Firestoreのルールを確認してください。");
  }
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (unsubscribeMemos) {
    unsubscribeMemos();
    unsubscribeMemos = null;
  }

  memos = [];
  selectedMemoId = null;
  editingMemoId = null;

  clearMemoForm();
  addMemoButton.textContent = "追加";
  closeForm();

  updateAuthUI();
  updateReorderUI();

  if (currentUser) {
    startMemoListener();
  } else {
    showLoginMessage();
  }
});

updateCategoryButton();
updateAuthUI();
updateReorderUI();
showLoginMessage();
