// 找到页面中的元素
const styleSelect = document.getElementById("style-select");
const selectedStylesArea = document.getElementById("selected-styles");
const statusMessage = document.getElementById("status-message");
const searchForm = document.getElementById("search-form");
const keywordInput = document.getElementById("keyword-input");
const artworkArea = document.getElementById("artwork-area");
const checkAnswersButton =
  document.getElementById("check-answers");

checkAnswersButton.addEventListener("click", checkAnswers);

// 图片放大窗口
const artworkOverlay =
  document.getElementById("artwork-overlay");

const largeArtwork =
  document.getElementById("large-artwork");

const closeArtworkButton =
  document.getElementById("close-artwork");

const artworkDetails =
  document.getElementById("artwork-details");

// 用来判断 Notes 是否打开
const notesPart =
  document.getElementById("notes-part");

const newRoundButton = document.getElementById("new-round");

newRoundButton.addEventListener("click", startNewRound);

// 记录打开窗口前点击的图片
let previousArtworkImage = null;



// 保存用户已经选择的流派
let selectedStyles = [];

// 保存这一轮找到的作品
let currentArtworks = [];

// 用作品 ID 保存用户放入的流派
let userAnswers = {};

// 记录是否正在搜索
let isSearching = false;


// 用户改变下拉框选项时，运行 addStyle
styleSelect.addEventListener("change", addStyle);

// 用户在输入框中按 Enter 时，提交表单
searchForm.addEventListener("submit", function (event) {
  // 阻止表单默认的页面刷新
  event.preventDefault();

  searchArtworks();
});

// 添加一个流派
function addStyle() {
  const style = styleSelect.value;

  // 让下拉框回到提示选项
  styleSelect.value = "";

  if (style === "") {
    return;
  }

  // 不允许重复选择
  if (selectedStyles.includes(style)) {
    statusMessage.textContent = "This style is already selected.";
    return;
  }

  // 最多选择六个流派
  if (selectedStyles.length >= 6) {
    statusMessage.textContent = "You can select up to six styles.";
    return;
  }

  selectedStyles.push(style);

  statusMessage.textContent = "";
  showStyleTags();
}

// 根据数组显示所有 Tag
function showStyleTags() {
  selectedStylesArea.replaceChildren();

  for (const style of selectedStyles) {
    const tag = document.createElement("div");
    tag.className = "style-tag";

    // 允许拖动这个 Tag
tag.draggable = true;

// 开始拖动时，保存这个 Tag 对应的流派名称
tag.addEventListener("dragstart", function (event) {
  event.dataTransfer.setData("text/plain", style);

  // 后面放入答案框时，使用副本，顶部 Tag 保留
  event.dataTransfer.effectAllowed = "copy";
});

    const styleName = document.createElement("span");
    styleName.textContent = style;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-style";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", "Remove " + style);

    removeButton.addEventListener("click", function () {
      removeStyle(style);
    });

    tag.appendChild(styleName);
    tag.appendChild(removeButton);

    selectedStylesArea.appendChild(tag);
  }
}

// 删除一个流派
function removeStyle(style) {
  const index = selectedStyles.indexOf(style);

  if (index !== -1) {
    selectedStyles.splice(index, 1);
  }

  statusMessage.textContent = "";
  showStyleTags();
}

// 检查条件，然后搜索作品
async function searchArtworks() {
  // 正在搜索时，不重复发送请求
  if (isSearching) {
    return;
  }

  const keyword = keywordInput.value.trim();

  if (selectedStyles.length === 0) {
    statusMessage.textContent =
      "Please select at least one art style.";
    return;
  }

  if (keyword === "") {
    statusMessage.textContent =
      "Please enter a keyword.";
    return;
  }

  isSearching = true;

  // 保存这次搜索使用的流派
  const roundStyles = selectedStyles.slice();

  currentArtworks = [];
  userAnswers = {};
  artworkArea.replaceChildren();

  statusMessage.textContent = "Loading artworks...";

  // 记录没有找到作品的流派
  const missingStyles = [];

  try {
    // 按顺序为每个流派寻找一件作品
    for (const style of roundStyles) {
      const artwork = await findArtwork(style, keyword);

      if (artwork !== null) {
        currentArtworks.push(artwork);
      } else {
        missingStyles.push(style);
      }
    }

     shuffleArtworks();
     showArtworks();

    if (missingStyles.length > 0) {
      statusMessage.textContent =
        "No matching artwork with an image was found for: " +
        missingStyles.join(", ") +
        ". Try another keyword or style.";
    } else {
      statusMessage.textContent =
        "Artworks loaded. Look closely and compare the images.";
    }
  } catch (error) {
    // 请求失败时清空本轮结果
    currentArtworks = [];
    artworkArea.replaceChildren();

    statusMessage.textContent =
      "Could not load artworks: " + error.message;

    console.error(error);
  } finally {
    // 无论成功还是失败，都结束搜索状态
    isSearching = false;
  }
}

// 同时按照关键词和流派搜索作品
async function findArtwork(style, keyword) {
  const searchUrl = new URL(
    "https://api.artic.edu/api/v1/artworks/search"
  );

  const parameters = {
    limit: 20,
    fields: [
      "id", "title", "artist_display", "date_display",
      "medium_display", "image_id", "style_title", "style_titles"
    ],
    query: {
      bool: {
        must: [{
          multi_match: {
            query: keyword,
            fields: ["title", "subject_titles", "description"],
            operator: "and"
          }
        }],
        filter: [
          { term: { "style_titles.keyword": style } },
          { exists: { field: "image_id" } }
        ]
      }
    }
  };

  searchUrl.searchParams.set("params", JSON.stringify(parameters));

  // 按顺序请求，每次间隔 1.1 秒，减少密集调用
  await new Promise(function (resolve) {
    setTimeout(resolve, 1100);
  });

  const response = await fetch(searchUrl, {
    referrerPolicy: "no-referrer"
  });

  if (response.status === 403) {
    throw new Error(
      "The museum denied this request. Please try again later."
    );
  }
  if (response.status === 429) {
    throw new Error(
      "Too many requests. Please wait before searching again."
    );
  }
  if (!response.ok) {
    throw new Error("Museum API error: " + response.status);
  }

  const result = await response.json();
  const availableArtworks = result.data.filter(function (artwork) {
    const alreadyUsed = currentArtworks.some(function (item) {
      return item.id === String(artwork.id);
    });
    return artwork.image_id && !alreadyUsed;
  });

  if (availableArtworks.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * availableArtworks.length);
  const artwork = availableArtworks[randomIndex];

  // ID 统一成文字，便于拖拽、答案检查和 History 查找
  return {
    id: String(artwork.id),
    title: artwork.title || "Untitled",
    artist: artwork.artist_display || "Unknown",
    date: artwork.date_display || "",
    medium: artwork.medium_display || "",
    style: style,
    imageUrl: result.config.iiif_url.replace(/\/$/, "") +
      "/" + artwork.image_id + "/full/843,/0/default.jpg",
    museumUrl: "https://www.artic.edu/artworks/" + artwork.id
  };
}

function showArtworks() {
  artworkArea.replaceChildren();

  // 记录这一轮的关键词，避免之后输入框改变
  const roundKeyword = keywordInput.value.trim();

  if (currentArtworks.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent =
      "No matching artworks were found. Try another keyword.";

    artworkArea.appendChild(message);
    return;
  }

  for (const artwork of currentArtworks) {
    const card = document.createElement("div");
    card.className = "artwork-card";

    const image = document.createElement("img");
    image.className = "artwork-image";

    // 为之后将图片加入 Notes 和下载做准备
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";

    // 暂时不在图片描述中泄露标题或流派答案
    image.alt = "Artwork for style matching";
    // 不让浏览器把作品图片当作可拖动元素
// Notes 打开时，图片才允许拖动
image.draggable = !notesPart.hidden;
image.tabIndex = 0;

// 无论 Notes 是否打开，点击图片都能放大
image.addEventListener("click", function () {
  openArtworkImage(artwork, image);
});

// 开始拖动图片
image.addEventListener("dragstart", function (event) {
  if (notesPart.hidden) {
    event.preventDefault();
    return;
  }

  // 用专门的数据类型，和流派 Tag 区分开
  event.dataTransfer.setData(
    "application/x-artwork-id",
    artwork.id
  );

  event.dataTransfer.effectAllowed = "copy";
});



    const answerBox = document.createElement("div");
    answerBox.className = "answer-box";
    answerBox.textContent = "Drop a style here";

    // 记录这个答案框属于哪件作品
    answerBox.dataset.artworkId = artwork.id;

    // 作品资料区域，答对前隐藏
const artworkInfo = document.createElement("div");
artworkInfo.className = "artwork-info";
artworkInfo.hidden = true;

// 错误动画结束后，移除错误样式
answerBox.addEventListener("animationend", function (event) {
  if (event.target === answerBox) {
    answerBox.classList.remove("wrong-answer");
  }
});

    // 允许在这个答案框上放下 Tag
answerBox.addEventListener("dragover", function (event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});

// 放下 Tag 时读取流派名称
answerBox.addEventListener("drop", function (event) {
  event.preventDefault();

  const style = event.dataTransfer.getData("text/plain");

  // 只接受本轮成功找到作品的流派
  const validStyle = currentArtworks.some(function (item) {
    return item.style === style;
  });

  if (!validStyle) {
    return;
  }

  // 同一个流派只能放在一个答案框里
  const answerBoxes = artworkArea.querySelectorAll(".answer-box");

  for (const box of answerBoxes) {
    const artworkId = box.dataset.artworkId;

    if (userAnswers[artworkId] === style) {
    delete userAnswers[artworkId];
    box.textContent = "Drop a style here";

  resetAnswerFeedback(box);
    }
  }

  // 新答案还没有提交，先清除目标框的旧反馈
  resetAnswerFeedback(answerBox);

// 保存当前作品的答案
userAnswers[artwork.id] = style;

  // 清除框里原来的内容
  answerBox.replaceChildren();

  const answerTag = document.createElement("span");
answerTag.className = "style-tag";
answerTag.textContent = style;

// 答案框里面的 Tag 也允许拖动
answerTag.draggable = true;

answerTag.addEventListener("dragstart", function (event) {
  event.dataTransfer.setData("text/plain", style);
  event.dataTransfer.effectAllowed = "copy";
});

answerBox.appendChild(answerTag);
});

    // 图片地址存在，也仍有可能加载失败
    image.addEventListener("error", function () {
      image.hidden = true;
      answerBox.textContent = "Image unavailable";

      statusMessage.textContent =
        "An artwork image could not load. Please try another search.";
    });


// 图片真正加载成功后，再加入历史记录
image.addEventListener("load", function () {
  // 图片所属卡片仍然在页面中才保存
  if (card.isConnected) {
    saveComparedArtwork(artwork, roundKeyword);
  }
}, { once: true });

    image.src = artwork.imageUrl;

    card.appendChild(image);
    card.appendChild(answerBox);
    card.appendChild(artworkInfo);
    
    artworkArea.appendChild(card);
  }
}

// 打乱本轮作品的排列顺序
function shuffleArtworks() {
  for (let i = currentArtworks.length - 1; i > 0; i--) {
    // 从第 0 个到第 i 个位置中随机选一个
    const randomIndex = Math.floor(
      Math.random() * (i + 1)
    );

    // 交换两件作品的位置
    const temporary = currentArtworks[i];

    currentArtworks[i] = currentArtworks[randomIndex];

    currentArtworks[randomIndex] = temporary;
  }
}

// 清除一个答案框上一次的检查状态
function resetAnswerFeedback(answerBox) {
  answerBox.classList.remove("correct-answer", "wrong-answer");

  const card = answerBox.parentElement;
  const artworkInfo = card.querySelector(".artwork-info");

  artworkInfo.hidden = true;
}


// 点击按钮后，检查所有答案
function checkAnswers() {
  // 搜索中不检查
  if (isSearching) {
    return;
  }

  if (currentArtworks.length === 0) {
    statusMessage.textContent = "Search for artworks first.";
    return;
  }

  const answerBoxes =
    artworkArea.querySelectorAll(".answer-box");

  let hasEmptyAnswer = false;

  for (const answerBox of answerBoxes) {
    const artworkId = answerBox.dataset.artworkId;

    // 找到这个答案框对应的作品
    const artwork = currentArtworks.find(function (item) {
      return item.id === artworkId;
    });

    const answer = userAnswers[artworkId];

    // 空框不算错误，不播放错误动画
    if (!answer) {
      hasEmptyAnswer = true;
      continue;
    }

    if (answer === artwork.style) {
      // 答对：保留 Tag，显示绿色和作品资料
      answerBox.classList.add("correct-answer");

      const artworkInfo =
        answerBox.parentElement.querySelector(".artwork-info");

      showArtworkInfo(artworkInfo, artwork);

    } else {
      // 答错：删除保存的答案和框里的 Tag
      delete userAnswers[artworkId];
      answerBox.textContent = "Drop a style here";

      resetAnswerFeedback(answerBox);

      // 短暂变红，并播放轻晃动画
      answerBox.classList.add("wrong-answer");
    }
  }

  // 不用文字报告错误，错误由动画表达
  statusMessage.textContent = hasEmptyAnswer
    ? "Drag a style into each empty answer box."
    : "";
}


// 在答对的作品下方显示基础资料
function showArtworkInfo(container, artwork) {
  // 防止重复点击时，把资料添加很多遍
  container.replaceChildren();

  const details = [
    ["Style", artwork.style],
    ["Title", artwork.title],
    ["Artist", artwork.artist],
    ["Date", artwork.date]
  ];

  // 有媒介资料才显示
  if (artwork.medium) {
    details.push(["Medium", artwork.medium]);
  }

  for (const detail of details) {
    const paragraph = document.createElement("p");

    const label = document.createElement("strong");
    label.textContent = detail[0] + ": ";

    const value = document.createElement("span");
    value.textContent = detail[1] || "Not provided";

    paragraph.appendChild(label);
    paragraph.appendChild(value);

    container.appendChild(paragraph);
  }

  const link = document.createElement("a");
  link.textContent = "View at the Art Institute of Chicago";
  link.href = artwork.museumUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  container.appendChild(link);

  // 所有内容准备好后再显示
  container.hidden = false;
}

// 打开放大图片
function openArtworkImage(artwork, image) {
  previousArtworkImage = image;

  // 这里只展示图片，不提前泄露答案和作品资料
  artworkDetails.replaceChildren();

  largeArtwork.crossOrigin = "anonymous";
  largeArtwork.referrerPolicy = "no-referrer";
  largeArtwork.alt = "Enlarged artwork";
  largeArtwork.src = artwork.imageUrl;

  artworkOverlay.hidden = false;

  // 让键盘焦点进入窗口
  closeArtworkButton.focus();
}


// 关闭放大图片
function closeArtworkImage() {
  artworkOverlay.hidden = true;

  // 关闭后清除图片地址
  largeArtwork.removeAttribute("src");
  largeArtwork.alt = "";

  // 把焦点还给原来的图片
  if (previousArtworkImage) {
    previousArtworkImage.focus();
  }
}

// 点击 × 关闭
closeArtworkButton.addEventListener(
  "click",
  closeArtworkImage
);

// 清空当前匹配，准备下一轮
function startNewRound() {
  // 搜索未结束时先不清空，避免旧结果随后重新出现
  if (isSearching) {
    statusMessage.textContent =
      "Please wait until the search finishes.";
    return;
  }

  // 清空作品和答案数据
  currentArtworks = [];
  userAnswers = {};

  // 清空作品区域，包括答案框和已显示的作品资料
  artworkArea.replaceChildren();

  // 清空选择的流派，并更新顶部 Tag
  selectedStyles = [];
  showStyleTags();

  // 下拉框回到默认选项，关键词清空
  styleSelect.value = "";
  keywordInput.value = "";

  statusMessage.textContent =
    "Choose styles and enter a keyword for a new round.";

  styleSelect.focus();
}