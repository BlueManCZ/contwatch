# ContWatch

System for controlling single-board microcontrollers powered by Python.

## Python dependencies

If you use [`apt`](https://en.wikipedia.org/wiki/APT_(software)) as your package manager, you can run:

```shell
xargs -a dependencies.txt sudo apt-get install
```

As an alternative you can use [`pip`](https://en.wikipedia.org/wiki/Pip_(package_manager)):

```shell
pip3 install -r requirements.txt --user
```

## Build

TypeScript needs to be compiled and bundled into JavaScript.

```shell
npm install
./node_modules/webpack/bin/webpack.js
```

## Usage

```shell
./run.py
```
