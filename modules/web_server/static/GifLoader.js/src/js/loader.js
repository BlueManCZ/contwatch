class Loader {
  constructor(imageSource, autohide, timeIn = 0) {
      this.loader = document.createElement('div');
      this.loader.classList.add('loader_hidden');
      this.loader.id = 'loader';

      let gif = document.createElement('img');
      gif.src = imageSource;
      gif.alt = 'Loading...';

      this.loader.appendChild(gif);
      document.body.appendChild(this.loader);
      document.body.classList.add('preload');

      if (autohide) {
          window.addEventListener('load', this.hide);
      }

      if (timeIn) {
          setTimeout(this._delayedShow, timeIn);
      } else {
          this.show();
      }
  }
  _delayedShow() {
      if (document.body.classList.contains('preload')) {
          document.body.classList.add('preload');
          this.loader.classList.remove('loader_hidden');
      }
  }
  show() {
      document.body.classList.add('preload');
      this.loader.classList.remove('loader_hidden');
  }
  hide() {
      document.body.classList.remove('preload');
      this.loader.classList.add('loader_hidden');
  }
}
