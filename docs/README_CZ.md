### Systém na ovládání jednodeskových počítačů

Autor práce: Bc. Ivo Šmerek <br>
Vedoucí práce: Mgr. Jan Tříska, Ph.D.

Univerzita Palackého v Olomouci <br>
Přírodovědecká fakulta <br>
Katedra informatiky <br>
<sub>květen 2022<sub>

<sub>
Doporučuji prohlížet tento dokument na webové adrese:<br>
https://github.com/BlueManCZ/contwatch/blob/master/docs/README_CZ.md
</sub>

### Webové adresy

1. Zdrojový kód na GitHubu:<br>
   https://github.com/BlueManCZ/contwatch


2. Živé demo systému:<br>
   http://brutus.webly3d.net:5000

### Instalace na operačním systému Raspbian

   (viz 6. kapitola diplomové práce)

Berte prosím na vědomí, že postup se může
na jiných linuxových distribucích lišit.

**Sestavení ze zdrojového kódu:**

```shell
apt-get update
apt-get install nodejs npm

npm install
npm run build
```

**Spuštění systému:**

Je vyžadován interpret jazyka Python verze minimálně 3.6.

Instalace runtime závislostí pomocí apt:

```shell
xargs -a dependencies.txt apt-get install
```

Alternativně lze využít pip3:

```shell
pip3 install -r requirements.txt --user
```

Spuštění systému:

```shell
python3 run.py
```
