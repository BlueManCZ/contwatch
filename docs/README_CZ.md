### Systém na ovládání jednodeskových počítačů

Autor práce: Bc. Ivo Šmerek <br>
Vedoucí práce: Mgr. Jan Tříska, Ph.D.

Univerzita Palackého v Olomouci <br>
Přírodovědecká fakulta <br>
Katedra informatiky <br>
<sub>květen 2022<sub>

<sub>
Teto dokument lze zobrazit na webové adrese:<br>
https://github.com/BlueManCZ/contwatch/blob/master/docs/README_CZ.md
</sub>

### Webové adresy

1. Zdrojový kód na GitHubu:<br>
   https://github.com/BlueManCZ/contwatch


2. Živé demo systému:<br>
   http://brutus.webly3d.net:5000

### Instalace na operačním systému Raspbian

<sub>(viz 6. kapitola diplomové práce)</sub>

Postup se může na ostatních linuxových distribucích lišit.

**1. Sestavení projektu:**

(Projekt přiložený k práci na CD a ve vydaných verzích systému je již sestaven, lze přeskočit na další krok)

```shell
apt-get update
apt-get install nodejs npm

npm install
npm run build
```

**2. Spuštění systému:**

Je vyžadován interpret jazyka Python verze minimálně 3.6.

Instalace runtime závislostí pomocí apt:

```shell
xargs -a dependencies.txt apt-get install
```

Alternativně lze použít pip3:

```shell
pip3 install -r requirements.txt --user
```

Spuštění systému:

```shell
python3 run.py
```

Ve výchozím nastavení spouští systém webový server na portu 80. K tomu je vyžadováno oprávnění správce. Port lze změnit v konfiguračním souboru [settings.py](https://github.com/BlueManCZ/contwatch/blob/master/settings.py).
