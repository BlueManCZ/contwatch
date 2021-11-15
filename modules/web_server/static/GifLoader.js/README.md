# GifLoader.js

Simple library in pure JavaScript to display an automatic loader component while the HTML page is loading.

![Loader](src/images/hex-loader.gif)

### Usage

Include `loader.css` and `loader.js` files in your HTML:

```html
<link rel="stylesheet" href="src/css/loader.css">
<script src="src/js/loader.js"></script>
```

Everything is automatic, just create new class instance in HTML `<body>`:

```html
<script>
    new Loader('src/images/hex-loader.gif', true);
</script>
```

Loader constructor takes two arguments: `new Loader(imageUrl, autoHide)`

In the first argument, you can specify your own image. In the second argument,
you can set if loader should automatically hide when the page is fully loaded.

You can hide loader manually:

```html
<script>
    // create new instance
    loader = new Loader('src/images/hex-loader.gif', false);

    // do some work here
    
    // manually hide loader
    loader.hide();
</script>
```