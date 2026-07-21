import './loading.css';
import iconUrl from './assets/icon.png';

window.addEventListener('DOMContentLoaded', () => {
  const img = document.querySelector('.app-icon');
  if (img) img.src = iconUrl;
});
