# ContWatch

Scalable system for IoT automation. Offers an intuitive web interface for controlling and monitoring devices.

## Run server
Make sure you have [pipenv](https://pipenv.pypa.io/en/latest/) installed.

```shell
cd src/server
pipenv install
pipenv run server
```

## Run client
Make sure you have [node.js](https://nodejs.org/en) installed.

```shell
cd src/client
npm install
npm run build
npm start
```

## Credits
This project is available thanks to following technologies and their communities:

| Name                                                       | Used for                 |
|------------------------------------------------------------|--------------------------|
| [Python](https://www.python.org/)                          | Server language          |
| [Flask](https://flask.palletsprojects.com/)                | Server framework         |
| [PonyORM](https://ponyorm.org/)                            | Server database          |
| [Black](https://black.readthedocs.io/en/stable/index.html) | Server code formatting   |
| [Node.js](https://nodejs.org/en)                           | Client codebase          |
| [TypeScript](https://www.typescriptlang.org/)              | Client language          |
| [Next.js](https://nextjs.org/)                             | Client backend           |
| [React](https://reactjs.org/)                              | Client framework         |
| [Redux](https://redux.js.org/)                             | Client state management  |
| [ESLint](https://eslint.org/)                              | Client code linting      |
| [Prettier](https://prettier.io/)                           | Client code formatting   |
| [Stylelint](https://stylelint.io/)                         | Client styles linting    |
