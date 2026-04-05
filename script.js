'use strict';

/* Получить ссылки на DOM-элементы */
const searchForm = document.getElementById('search-form');
const usernameInput = document.getElementById('username');
const searchBtn = document.getElementById('searchBtn');
const errorDiv = document.getElementById('error');
const loader = document.getElementById('loader');
const profileSection = document.getElementById('profile-section');
const profileDiv = document.getElementById('profile');
const reposSection = document.getElementById('repos-section');
const reposList = document.getElementById('repos');
const historySection = document.getElementById('history-section');
const historyDiv = document.getElementById('history');
const clearHistoryBtn = document.getElementById('clearHistory');

const pagination = document.querySelector('#pagination');
const pageBtnList = document.querySelector('#pag-list');
const prevBtn = document.querySelector('#prev-btn');
const nextBtn = document.querySelector('#next-btn');


/* Функция для отображения ошибок */
function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
}

/* Функция для очистки ошибок */
function clearError() {
  errorDiv.textContent = '';
  errorDiv.classList.add('hidden');
}

/* Функция для управления loader */
function showLoader() {
  loader.classList.remove('hidden');
}

function hideLoader() {
  loader.classList.add('hidden');
}

/* Функция для выключения кнопки */
function disableBtn(btn) {
  btn.disabled = true;
  btn.classList.add('disabled');
}

/* Функция для включения кнопки */
function enableBtn(btn) {
  btn.disabled = false;
  btn.classList.remove('disabled');
}

/* 
  Debounce эффект, используем замыкания для сохранения id setTimeout.
  Каждый вызов функции очищает предыдущий setTimeout
*/
function createDebounce() {
  let id = null;
  return function(fn, delay, e) {
    clearTimeout(id)
    id = setTimeout(() => {
      fn(e);
    }, delay)
  }
}

/* Debounce обертка */
const debounce = createDebounce();

/* Функция для получения данных профиля пользователя */
async function getUser(username) {
  // ПОЧЕМУ async/await? — Позволяет писать асинхронный код как синхронный, проще читать.
  // ПОЧЕМУ try/catch? — Для обработки ошибок сети и исключений.
  // ПОЧЕМУ проверяем response.ok? — fetch не выбрасывает ошибку при 404, нужно проверять вручную.
  const userResponse = await fetch(`https://api.github.com/users/${username}`);

  if(userResponse.status === 404) {
    throw new Error("Пользователь не найден 404");
  }

  if(!userResponse.ok) {
    throw new Error("Сервер ответил: " + userResponse.status)
  } 
  const contentType = userResponse.headers.get('Content-Type');

  if(contentType && contentType.includes('application/json')) {
    const user = await userResponse.json();  
    return user;
  }
}

/* Функция для получения репозиториев пользователя */
async function getRepos(username, currentPage) {
  // Аналогично getUser, fetch репозиториев
  const reposResp = await fetch(`https://api.github.com/users/${username}/repos?per_page=5&page=${currentPage}`);
  if(!reposResp.ok) {
    throw new Error("Сервер ответил: " + reposResp.status)
  } 

  const contentType = reposResp.headers.get('Content-Type');
  
  if(contentType && contentType.includes('application/json')) {
    const repos = await reposResp.json();  
    return repos;
  }
}

/* Функция для отображения профиля */
function renderProfile(data) {
  profileSection.classList.remove('hidden');
  profileDiv.textContent = '';
  
  const userCard = document.createElement('div');
  userCard.classList.add('profile-card');
  
  const userImg = document.createElement('img');
  userImg.src = data['avatar_url'];
  userImg.alt = 'avatar';

  const userName = document.createElement('h2');
  userName.textContent = data['login'];

  const userBio = document.createElement('p');
  userBio.textContent = data['bio'];
  
  const publicRepos = document.createElement('span');
  publicRepos.textContent = `Публичных репозиториев: ${data['public_repos']}`

  userCard.append(userImg, userName, userBio, publicRepos);
  profileDiv.append(userCard);
  
}

/* Функция для отображения репозиториев */
function renderRepos(repos) {
  reposSection.classList.remove('hidden');
  reposList.textContent = '';
  repos.forEach(repo => {
    const repoLi = document.createElement('li');
    
    const repoHead = document.createElement('h2');
    const repoRef = document.createElement('a');

    repoRef.textContent = repo['name'];
    repoRef.href = repo['html_url']
    repoHead.append(repoRef);

    const repoDesc = document.createElement('p');
    repoDesc.textContent = repo['description'];
    const repoRating = document.createElement('span');
    repoRating.textContent = `⭐ ${repo['stargazers_count']}`;

    repoLi.append(repoHead, repoDesc, repoRating);
    reposList.append(repoLi);
  })
}

/* 
  C Promise.all 
  ПОЧЕМУ? комментарий: преимущества параллельных запросов для ускорения. Promis.all позволяет
  выполнять несколько промисов параллельно и возвращает один промис.  
*/
const handleSearch = async (e) => {
  e.preventDefault();
  setDefaults();

  const username = usernameInput.value.trim();
  if (!username) {
    showError('Введите имя пользователя GitHub');
    return;
  } else if (username.length > 39) {
    showError('Имя пользователя не может быть более 39 символов!');
    return;
  }

  try {
    showLoader();
    disableBtn(searchBtn);

    const [user, repos] = await Promise.all([
      getUser(username),
      getRepos(username, currentPage)
    ]);

    if(!user) {
      throw new Error('Ошибка: user возможно null или undefined')
    }

    renderProfile(user);
    saveToStorage(user.login);
    reposQuantity = user['public_repos'];

    if(!repos) {
      throw new Error('Ошибка: repos возможно null или undefined')
    }

    renderRepos(repos);
    renderPageBtns(currentPage);
    renderFromStorage();

  } catch (error) {
    showError(error.message);
  } finally {
    hideLoader();
    enableBtn(searchBtn);
  }
}

/* Устанавливает дефолтные значения */
function setDefaults() {
  clearError();
  pagesQuantity = null;
  reposQuantity = null;
  currentPage = 1;
  profileSection.classList.add('hidden');
  reposSection.classList.add('hidden');
  historySection.classList.add('hidden');
  pagination.classList.add('hidden');
}


searchForm.addEventListener('submit', handleSearch);
usernameInput.addEventListener('input', (e) => debounce(handleSearch, 1000, e));


/*
===============================================================================
  ПАГИНАЦИЯ
===============================================================================
*/

let reposQuantity;
let pagesQuantity;
let currentPage = 1;
let btnTotalNum = 4 // btnTotalNum + 1 - Количество кнопок пагинации для отображения

/*
 Рендерит кнопки пагинации 
 Параметры: firtstBtnNum - номер с которого по порядку рендерятся кнопки
*/
function renderPageBtns(firstBtnNum) {
    pagesQuantity = Math.ceil(reposQuantity / 5);
    pageBtnList.textContent = '';
    
    if(pagesQuantity > 1) {
      pagination.classList.remove('hidden');
    }
    
    for (let i = firstBtnNum; i <= firstBtnNum + btnTotalNum; i++) {
      // Проверка: количество кнопок не может быть больше количества страниц
      if(i > pagesQuantity) {
        break;
      }

      const pageBtn = createPageBtn(i);
      pageBtnList.append(pageBtn);

      // Добавляем ... + последнюю кнопку 
      if (i === firstBtnNum + btnTotalNum &&  i < pagesQuantity) {
        const lastBtn = createPageBtn(pagesQuantity);
        const dotesSpan = document.createElement('span');
        dotesSpan.textContent = '...';
        pageBtnList.append(dotesSpan, lastBtn);
      }
      // Добавляем первую кнопку + ...
      if (i === firstBtnNum && firstBtnNum - 1 >= 1) {
        const firstBtn = createPageBtn(1);
        const dotesSpan = document.createElement('span');
        dotesSpan.textContent = '...';
        pageBtnList.prepend(firstBtn, dotesSpan);
      }
    }
    // Когда все кнопки отрендерились запускаем highlightCurrentBtn
    highlightCurrentBtn();
    // Переключения активности prev и next кнопок.
    switchDisablePrevNext();
}

/*
  Содает кнопку пагинации
  Параметры: page - номер кнопки (страницы)
*/
function createPageBtn(page) {
      const pageItem = document.createElement('li');
      const pageBtn = document.createElement('button'); 
      pageBtn.setAttribute("data-page", page);
      pageBtn.textContent = page;
      pageItem.append(pageBtn);
      return pageItem
}

/*
  Переключает активность prev и next кнопок.
  Последняя страница - disable nextBtn, Первая страница - disable prevBtn;
*/
function switchDisablePrevNext() {
  if(currentPage == 1) {
    disableBtn(prevBtn);
    enableBtn(nextBtn);
  } else if(currentPage == pagesQuantity) {
    disableBtn(nextBtn);
    enableBtn(prevBtn);
  } else {
    enableBtn(nextBtn);
    enableBtn(prevBtn);
  }
}


/* Выделяет кнопку текущей страницы */
function highlightCurrentBtn() {
  const pageBtns = pageBtnList.querySelectorAll('button');
  pageBtns.forEach(btn => {
    if(Number(btn.dataset.page) === currentPage) {
      btn.classList.add('current');
    } else {
      btn.classList.remove('current');
    }
  });
}

/* обрабатывает получение репозиториев пользователя */
async function fetchRenderRepos() {
  try {
    showLoader();
    const repos = await getRepos(usernameInput.value, currentPage);
    
    if(!repos) {
      throw new Error("Ошибка: repos возможно null или undefined!");
    }

    renderRepos(repos);
  } catch (error) {
    console.log(error.message);
  } finally {
    hideLoader();
  }
}

prevBtn.addEventListener('click', async () => {
  if(currentPage == 1) return;
  currentPage--;

  // Если количество кнопок больше количества отображаемых, 
  // то дополнительно отображаем последнюю кнопку, первую + фиксированное кол-во
  if(pagesQuantity > btnTotalNum + 1) {
    // рендериум кнопки если текущая кнопка крайняя левая (смещение влево)
    const spanEl = pageBtnList.firstElementChild.nextElementSibling;
    const leftMostBtnNum = spanEl.tagName === "SPAN"
    ? spanEl.nextElementSibling.querySelector('button').dataset.page
    : pageBtnList.firstElementChild.querySelector('button').dataset.page
  
    if (leftMostBtnNum > currentPage) {
      renderPageBtns(currentPage);
    }
  }

  highlightCurrentBtn();
  switchDisablePrevNext();
  fetchRenderRepos();
})



nextBtn.addEventListener('click', async () => {
  if(currentPage >= pagesQuantity) return;
  currentPage++;

  // Если количество кнопок больше количества отображаемых, 
  // то дополнительно отображаем последнюю кнопку, первую + фиксированное кол-во
  if(pagesQuantity > btnTotalNum + 1) {
    // рендериум кнопки если текущая кнопка крайняя справа (смещение вправо)
    const spanEl = pageBtnList.lastElementChild.previousElementSibling;
    const rightMostBtnNum = spanEl.tagName === "SPAN" 
    ? spanEl.previousElementSibling.querySelector('button').dataset.page
    : pageBtnList.lastElementChild.querySelector('button').dataset.page
    
    if(Number(rightMostBtnNum) == currentPage - 1) {
      renderPageBtns(currentPage - btnTotalNum);
    }
  }

  highlightCurrentBtn();
  switchDisablePrevNext();
  fetchRenderRepos();
})

pageBtnList.addEventListener('click', async (e) => {
  if (e.target.tagName == 'BUTTON') {
    const page = e.target.dataset.page;
    const prevPage = currentPage;
    currentPage = Number(page);

    // Если пользователь выбрал сразу последнюю страницу
    if(currentPage - prevPage > btnTotalNum) {
      renderPageBtns(currentPage - btnTotalNum);
    }

    // Если пользователь выбрал первую страницу
    if(prevPage - currentPage > btnTotalNum) {
      renderPageBtns(currentPage);
    }

    highlightCurrentBtn();
    switchDisablePrevNext();
    fetchRenderRepos();
  }
})

/*=================================================================================*/



/*
===============================================================================
  LocalStorage
===============================================================================
*/

/* 
  Сохраняет логин пользователя в localStorage
  Параметры: username - логин пользователя ['login']
*/
function saveToStorage(username) {
  let usernameArr = loadFromStorage('gh-search-history');
  if(!usernameArr) {
    //  нет массива - создаем новый
    usernameArr = [];
    usernameArr.push(username);
  } 
  if(usernameArr.includes(username)) {
    // в массиве уже есть такоей пользователь
    return;
  } 
  usernameArr.push(username);
  if(usernameArr.length > 3) {
    usernameArr.shift();
  }

  try {
    localStorage.setItem("gh-search-history", JSON.stringify(usernameArr));
  } catch (error) {
    console.warn('localStorage недоступен: ', error);
  }
}

/*
  Загружает объект по ключю из localStorage
  Параметры: key
*/
function loadFromStorage(key) {
  try {
    const loadObj = localStorage.getItem(key);
    if(!loadObj) return;
    return JSON.parse(loadObj);
  } catch (error) {
    return error;
  }
}

/*
  Рендерит теги пользователей
*/
function renderFromStorage() {
  historySection.classList.add('hidden');
  historyDiv.textContent = '';

  const users = loadFromStorage("gh-search-history");
  if (!users) return;

  users.forEach(username => {
    const userTag = document.createElement('button');
    userTag.textContent = `#${username}`;
    historyDiv.append(userTag);
  })

  historySection.classList.remove('hidden');
}

historyDiv.addEventListener('click', (e) => {
  if(e.target.tagName == 'BUTTON') {
    usernameInput.value = e.target.textContent.slice(1);
    const changeEvent = new Event('submit');
    searchForm.dispatchEvent(changeEvent);
  }
})

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem('gh-search-history');
  renderFromStorage();
})

/*=================================================================================*/


// initials 
renderFromStorage()
