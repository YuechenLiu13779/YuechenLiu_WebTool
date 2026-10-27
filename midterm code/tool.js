// Notes 面板内的提示文字
const notesHint = document.getElementById("notes-hint");

// Notes 的打开按钮和关闭按钮
const notesButton = document.getElementById("notes-button");
const closeNotesButton = document.getElementById("close-notes");

// 点击 Notes：打开或关闭面板
notesButton.addEventListener("click", function () {
  notesPart.hidden = !notesPart.hidden;

  updateImageDragging();

  notesButton.setAttribute(
    "aria-expanded",
    String(!notesPart.hidden)
  );
});

// 点击面板里的 ×：关闭面板
closeNotesButton.addEventListener("click", function () {
  notesPart.hidden = true;
  updateImageDragging();
  notesButton.setAttribute("aria-expanded", "false");

  notesButton.focus();
});

// 页面开始时，Notes 是关闭的
notesButton.setAttribute("aria-expanded", "false");
notesButton.setAttribute("aria-controls", "notes-part");

// 根据 Notes 开关状态，更新作品图片
function updateImageDragging() {
  const images =
    artworkArea.querySelectorAll(".artwork-image");

  for (const image of images) {
    image.draggable = !notesPart.hidden;
  }
}

// Notes 的内容区域
const notesContent =
  document.getElementById("notes-content");

// 暂时保存加入笔记的图片资料
let noteItems = [];

const notesTitle = document.getElementById("notes-title");
const clearNotesButton = document.getElementById("clear-notes");
const saveNotesButton = document.getElementById("save-notes");

// 当前笔记的编号，第一次保存时才创建
let currentNoteId = null;

// 用户以前保存过的笔记
let notesHistory = [];

try {
  const savedNotes = JSON.parse(
    localStorage.getItem("artStyleMatchAICNotesHistory")
  );

  if (Array.isArray(savedNotes)) {
    notesHistory = savedNotes;
  }
} catch (error) {
  notesHint.textContent =
    "Saved notes could not be read in this browser.";
}



// 当前正在 Notes 内移动的图片容器
let draggedNoteImage = null;

// 只允许作品图片拖进 Notes，不接收流派 Tag
notesContent.addEventListener("dragover", function (event) {
  const isArtwork = event.dataTransfer.types.includes(
    "application/x-artwork-id"
  );

  if (!notesPart.hidden && isArtwork) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }
});

// 图片放入 Notes 时
notesContent.addEventListener("drop", function (event) {
  event.preventDefault();

  if (notesPart.hidden) {
    return;
  }

  const artworkId = event.dataTransfer.getData(
    "application/x-artwork-id"
  );

  // 根据 ID 找到当前作品
  const artwork = currentArtworks.find(function (item) {
    return item.id === artworkId;
  });

  if (!artwork) {
    return;
  }

  // 同一件作品在当前 Notes 中只添加一次
  const alreadyAdded = noteItems.some(function (item) {
    return item.id === artworkId;
  });

  if (alreadyAdded) {
    notesHint.textContent =
     "This artwork is already in your notes.";
    return;
  }

  // 保存图片资料
const imageItem = {
  type: "image",
  id: artwork.id,
  imageUrl: artwork.imageUrl
};

noteItems.push(imageItem);
renderNoteImage(imageItem);

  notesHint.textContent = "Added to Notes.";
});

// 点击 Notes 内容区或面板本身的空白，创建文字框
notesPart.addEventListener("click", function (event) {
  const clickedBlank =
    event.target === notesContent ||
    event.target === notesPart;

  if (!clickedBlank) {
    return;
  }

  addNoteText();
});


// 创建一个可以编辑和删除的文字笔记
function addNoteText(existingItem = null, focusText = true) {
  const textItem = existingItem || {
    type: "text",
    text: ""
  };

  // 新文字才添加数据，恢复旧文字时不重复添加
  if (existingItem === null) {
    noteItems.push(textItem);
  }

  // 容器包含文字框和删除按钮
  const textContainer = document.createElement("div");
  textContainer.className = "note-text-item";

  textContainer.noteItem = textItem;

  const textarea = document.createElement("textarea");
  textarea.className = "note-text";
  textarea.placeholder = "Write your observations...";
  textarea.rows = 3;

  // 恢复之前保存的文字
textarea.value = textItem.text;

  textarea.setAttribute("aria-label", "Your artwork observations");

  textarea.addEventListener("input", function () {
    textItem.text = textarea.value;
  });

  // 删除这条文字的按钮
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-note-text";
  deleteButton.textContent = "×";
  deleteButton.setAttribute("aria-label", "Delete this text");

  deleteButton.addEventListener("click", function () {
    // 删除数据中的这一条
    const index = noteItems.indexOf(textItem);

    if (index !== -1) {
      noteItems.splice(index, 1);
    }

    // 删除页面中的文字框和按钮
    textContainer.remove();

    notesHint.textContent =
      "Text removed. Click the blank area to write.";
  });

  textContainer.appendChild(textarea);
  textContainer.appendChild(deleteButton);

  notesContent.appendChild(textContainer);

  // 新建文字时聚焦，批量恢复时不逐个聚焦
if (focusText) {
  textarea.focus();
}

  notesHint.textContent =
    "Click another blank area to add more text.";
}

// 允许 Notes 内的图片移动到内容区
notesContent.addEventListener("dragover", function (event) {
  if (!draggedNoteImage || notesPart.hidden) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
});

// 放下时，改变图片在 Notes 中的位置
notesContent.addEventListener("drop", function (event) {
  if (!draggedNoteImage || notesPart.hidden) {
    return;
  }

  event.preventDefault();

  // 找到鼠标放下位置对应的图片或文字容器
  const targetItem = event.target.closest(
    ".note-image-item, .note-text-item"
  );

  if (targetItem === draggedNoteImage) {
    return;
  }

  if (targetItem && targetItem.parentElement === notesContent) {
    const rectangle = targetItem.getBoundingClientRect();
    const middle = rectangle.top + rectangle.height / 2;

    if (event.clientY < middle) {
      // 放在目标上半部分：移动到目标前面
      notesContent.insertBefore(draggedNoteImage, targetItem);
    } else {
      // 放在目标下半部分：移动到目标后面
      notesContent.insertBefore(
        draggedNoteImage,
        targetItem.nextSibling
      );
    }
  } else {
    // 放在空白处：移动到内容末尾
    notesContent.appendChild(draggedNoteImage);
  }

  // 按新的页面排列顺序，更新笔记数据
  noteItems = Array.from(notesContent.children).map(
    function (element) {
      return element.noteItem;
    }
  );

  notesHint.textContent = "Image position updated.";
});

// 清空当前笔记，开始一份新笔记
clearNotesButton.addEventListener("click", function () {
  notesContent.replaceChildren();

  noteItems = [];
  draggedNoteImage = null;
  notesTitle.value = "";
  currentNoteId = null;

  notesHint.textContent =
    "Notes cleared. Drag artworks here or click the blank area to write.";
});

saveNotesButton.addEventListener("click", function () {
  const title = notesTitle.value.trim();

  if (title === "") {
    notesHint.textContent = "Please give your notes a name.";
    notesTitle.focus();
    return;
  }

  // 忽略只有空格、没有内容的文字框
  const meaningfulItems = noteItems.filter(function (item) {
    return item.type === "image" ||
      (item.type === "text" && item.text.trim() !== "");
  });

  if (meaningfulItems.length === 0) {
    notesHint.textContent =
      "Add an artwork or some text before saving.";
    return;
  }

  // 已保存过就使用旧编号，否则创建新编号
  const noteId = currentNoteId || crypto.randomUUID();

  const savedNote = {
    id: noteId,
    title: title,
    savedAt: new Date().toISOString(),

    // 保存独立副本，避免继续编辑时直接改变历史记录
    items: JSON.parse(JSON.stringify(meaningfulItems))
  };

  const updatedHistory = notesHistory.slice();

  const index = updatedHistory.findIndex(function (note) {
    return note.id === noteId;
  });

  if (index === -1) {
    updatedHistory.unshift(savedNote);
  } else {
    updatedHistory[index] = savedNote;
  }

  try {
    localStorage.setItem(
      "artStyleMatchAICNotesHistory",
      JSON.stringify(updatedHistory)
    );

    // 浏览器保存成功后，再更新当前状态
    notesHistory = updatedHistory;
    currentNoteId = noteId;

    notesHint.textContent = "Saved to Notes History.";

    if (!historyOverlay.hidden && activeHistoryTab === "notes") {
  showNotesHistory();
}

  } catch (error) {
    notesHint.textContent =
      "Notes could not be saved. Browser storage may be unavailable or full.";
  }
});

// History 按钮、窗口和关闭按钮
const historyButton = document.getElementById("history-button");
const historyOverlay = document.getElementById("history-overlay");
const closeHistoryButton = document.getElementById("close-history");

// 两个 History 标签
const artworkHistoryTab =
  document.getElementById("compare-history-tab");

const notesHistoryTab =
  document.getElementById("notes-history-tab");

// 两个标签共用的内容区
const historyContent =
  document.getElementById("history-content");

// 当前选择的标签
let activeHistoryTab = "artworks";

// 点击 History，打开窗口
historyButton.addEventListener("click", function () {
  historyOverlay.hidden = false;

  switchHistoryTab(activeHistoryTab);

  closeHistoryButton.focus();
});

// 点击 ×，关闭窗口
closeHistoryButton.addEventListener("click", function () {
  historyOverlay.hidden = true;

  historyButton.focus();
});

// 点击 Artwork History 标签
artworkHistoryTab.addEventListener("click", function () {
  switchHistoryTab("artworks");
});

// 点击 Notes History 标签
notesHistoryTab.addEventListener("click", function () {
  switchHistoryTab("notes");
});

// 切换 History 的内容和选中样式
function switchHistoryTab(tab) {
  activeHistoryTab = tab;

  artworkHistoryTab.classList.toggle(
    "active-history-tab",
    tab === "artworks"
  );

  notesHistoryTab.classList.toggle(
    "active-history-tab",
    tab === "notes"
  );

   historyContent.replaceChildren();

  if (tab === "notes") {
  showNotesHistory();
} else {
  showArtworkHistory();
}
}

// 根据已有图片资料创建笔记图片
function renderNoteImage(imageItem) {
// 容器包含图片和删除按钮
const imageContainer = document.createElement("div");
imageContainer.className = "note-image-item";
imageContainer.draggable = true;

// 让页面元素对应到自己的笔记数据
imageContainer.noteItem = imageItem;

const noteImage = document.createElement("img");
noteImage.className = "note-image";
noteImage.crossOrigin = "anonymous";
noteImage.referrerPolicy = "no-referrer";
noteImage.alt = "Artwork added to notes";

// 拖动外层容器，不使用浏览器默认的图片拖动
noteImage.draggable = false;

noteImage.addEventListener("error", function () {
  notesHint.textContent = "A notes image could not load.";
});

noteImage.src = imageItem.imageUrl;

// 删除按钮
const deleteButton = document.createElement("button");
deleteButton.type = "button";
deleteButton.className = "delete-note-image";
deleteButton.textContent = "×";
deleteButton.setAttribute("aria-label", "Delete this image");

deleteButton.addEventListener("click", function () {
  const index = noteItems.indexOf(imageItem);

  if (index !== -1) {
    noteItems.splice(index, 1);
  }

  imageContainer.remove();
  notesHint.textContent = "Image removed.";
});

// 开始移动 Notes 内的图片
imageContainer.addEventListener("dragstart", function (event) {
  if (event.target.closest("button")) {
    event.preventDefault();
    return;
  }

  draggedNoteImage = imageContainer;

  event.dataTransfer.setData(
    "application/x-note-image",
    imageItem.id
  );

  event.dataTransfer.effectAllowed = "move";
  imageContainer.classList.add("moving-note");
});

// 拖动结束，清除状态
imageContainer.addEventListener("dragend", function () {
  imageContainer.classList.remove("moving-note");
  draggedNoteImage = null;
});

imageContainer.appendChild(noteImage);
imageContainer.appendChild(deleteButton);
notesContent.appendChild(imageContainer);
}

// 显示已保存的笔记列表
function showNotesHistory() {
  historyContent.replaceChildren();

  if (notesHistory.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No saved notes yet.";
    historyContent.appendChild(message);
    return;
  }

  for (const note of notesHistory) {
    const row = document.createElement("div");
    row.className = "notes-history-row";

    // 笔记名称也可以点击打开
    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.className = "notes-history-name";
    nameButton.textContent = note.title;

    nameButton.addEventListener("click", function () {
      openSavedNote(note);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", function () {
      const updatedHistory = notesHistory.filter(function (item) {
        return item.id !== note.id;
      });

      try {
        localStorage.setItem(
          "artStyleMatchAICNotesHistory",
          JSON.stringify(updatedHistory)
        );

        notesHistory = updatedHistory;

        // 如果删除的是当前打开的记录，下次保存视为新记录
        if (currentNoteId === note.id) {
          currentNoteId = null;
        }

        showNotesHistory();

      } catch (error) {
        const message = document.createElement("p");
        message.setAttribute("role", "status");
        message.textContent = "The saved note could not be deleted.";
        row.appendChild(message);
      }
    });

    row.appendChild(nameButton);
    row.appendChild(deleteButton);

    historyContent.appendChild(row);
  }
}

// 打开历史笔记，恢复到右侧编辑区
function openSavedNote(note) {
  // 恢复独立副本，编辑时不直接改变历史记录
  const restoredItems = JSON.parse(
    JSON.stringify(note.items)
  );

  notesContent.replaceChildren();
  draggedNoteImage = null;

  currentNoteId = note.id;
  notesTitle.value = note.title;
  noteItems = restoredItems;

  for (const item of noteItems) {
    if (item.type === "image") {
      renderNoteImage(item);

    } else if (item.type === "text") {
      addNoteText(item, false);
    }
  }

  // 关闭 History，打开 Notes
  historyOverlay.hidden = true;
  notesPart.hidden = false;

  notesButton.setAttribute("aria-expanded", "true");
  updateImageDragging();

  notesHint.textContent =
    "Saved notes opened. Click Save after editing.";

  notesTitle.focus();
}

const downloadNotesButton =
  document.getElementById("download-notes");

downloadNotesButton.addEventListener("click", downloadNotes);

// 将当前 Notes 下载为 JPG
async function downloadNotes() {
  const meaningfulItems = noteItems.filter(function (item) {
    return item.type === "image" ||
      (item.type === "text" && item.text.trim() !== "");
  });

  if (meaningfulItems.length === 0) {
    notesHint.textContent = "Add images or text before downloading.";
    return;
  }

  if (typeof html2canvas !== "function") {
    notesHint.textContent =
      "The image export library could not load. Please refresh and try again.";
    return;
  }

  // 下载当前内容，不要求先点击 Save
  const title = notesTitle.value.trim() || "My Notes";

  // 复制当前数据，导出期间的修改不会影响这次下载
  const items = JSON.parse(JSON.stringify(meaningfulItems));

  downloadNotesButton.disabled = true;
  notesHint.textContent = "Preparing your JPG...";

  // 创建临时导出区域，放在屏幕外面
  const exportArea = document.createElement("div");

  exportArea.className = "notes-export";
  exportArea.style.width =
    Math.max(notesContent.clientWidth, 320) + "px";

  const heading = document.createElement("h2");
  heading.textContent = title;
  exportArea.appendChild(heading);

  const content = document.createElement("div");
  content.className = "notes-export-content";
  exportArea.appendChild(content);

  for (const item of items) {
    if (item.type === "image") {
      const image = document.createElement("img");

      image.crossOrigin = "anonymous";
      image.referrerPolicy = "no-referrer";
      image.alt = "Artwork in notes";
      image.src = item.imageUrl;

      content.appendChild(image);

    } else if (item.type === "text") {
      const paragraph = document.createElement("p");
      paragraph.textContent = item.text;
      content.appendChild(paragraph);
    }
  }

  document.body.appendChild(exportArea);

  try {
    // 等待图片加载，避免导出时图片还没出现
    const images = exportArea.querySelectorAll("img");

    await Promise.all(
      Array.from(images).map(function (image) {
        return image.decode();
      })
    );

    const canvas = await html2canvas(exportArea, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false
    });

    // 替换文件名中不适合使用的字符
    const filename = title.replace(/[\\/:*?"<>|]/g, "-");

    const link = document.createElement("a");
    link.download = filename + ".jpg";
    link.href = canvas.toDataURL("image/jpeg", 0.92);

    document.body.appendChild(link);
    link.click();
    link.remove();

    notesHint.textContent = "JPG download requested.";

  } catch (error) {
    console.error("Notes export failed:", error);

    notesHint.textContent =
      "Could not export the notes. Check that all images can load.";

  } finally {
    // 无论成功或失败，都移除临时区域
    exportArea.remove();
    downloadNotesButton.disabled = false;
  }
}

// 自动保存实际展示过的作品
let artworkHistory = [];

// 馆藏资料最多保留四周
const artworkHistoryLifetime = 28 * 24 * 60 * 60 * 1000;

try {
  const savedArtworks = JSON.parse(
    localStorage.getItem("artStyleMatchAICArtworkHistory")
  );

  if (Array.isArray(savedArtworks)) {
    // 读取时移除过期记录
    artworkHistory = savedArtworks.filter(function (artwork) {
      return Date.now() - artwork.firstSeenAt <
        artworkHistoryLifetime;
    });

    localStorage.setItem(
      "artStyleMatchAICArtworkHistory",
      JSON.stringify(artworkHistory)
    );
  }

} catch (error) {
  console.error("Could not read artwork history:", error);
}

// 图片成功显示后，保存这件作品
function saveComparedArtwork(artwork, keyword) {
  // 先移除过期记录
  const recentHistory = artworkHistory.filter(function (item) {
    return Date.now() - item.firstSeenAt <
      artworkHistoryLifetime;
  });

  const alreadySaved = recentHistory.some(function (item) {
    return item.id === artwork.id;
  });

  if (alreadySaved) {
    return;
  }

  // 复制资料，不直接修改本轮作品对象
  const savedArtwork = Object.assign({}, artwork, {
    firstKeyword: keyword,
    firstSeenAt: Date.now()
  });

  recentHistory.unshift(savedArtwork);

  try {
    localStorage.setItem(
      "artStyleMatchAICArtworkHistory",
      JSON.stringify(recentHistory)
    );

    artworkHistory = recentHistory;

    // 如果当前正在查看作品历史，就更新显示
    if (!historyOverlay.hidden && activeHistoryTab === "artworks") {
      showArtworkHistory();
    }

  } catch (error) {
    console.error("Could not save artwork history:", error);

    statusMessage.textContent =
      "Artwork loaded, but history could not be saved.";
  }
}

// 显示作品历史缩略图
function showArtworkHistory() {
  historyContent.replaceChildren();

  if (artworkHistory.length === 0) {
    const message = document.createElement("p");
    message.textContent =
      "Artworks will appear here after you search and view them.";

    historyContent.appendChild(message);
    return;
  }

  for (const artwork of artworkHistory) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "artwork-history-item";
    button.setAttribute(
      "aria-label",
      "View " + artwork.title
    );

    const image = document.createElement("img");
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.alt = artwork.title;
    image.loading = "lazy";
    image.draggable = false;
    image.src = artwork.imageUrl;

    button.appendChild(image);

    // 历史记录中允许查看完整资料
    button.addEventListener("click", function () {
      openArtworkImage(artwork, button);

      showArtworkInfo(artworkDetails, artwork);

      const keyword = document.createElement("p");
      keyword.textContent =
        "First keyword: " + artwork.firstKeyword;

      const date = document.createElement("p");
      date.textContent =
        "First viewed: " +
        new Date(artwork.firstSeenAt).toLocaleString();

      artworkDetails.appendChild(keyword);
      artworkDetails.appendChild(date);
    });

    historyContent.appendChild(button);
  }
}