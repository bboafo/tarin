# TARIN website

Static site: plain HTML, CSS and JavaScript, no build tools, no server code.
Any static host serves it as it is (GitHub Pages, Netlify, Cloudflare Pages,
or a plain web server).

```
www/
  index.html               Home
  price-record/index.html  Ghana's Price Record (the data story)
  explorer/index.html      Data explorer (the CPI, every region and product group)
  catalogue/index.html     Catalogue: every other StatsBank table, and any series against any other
  forecast/index.html      Forecast (frozen, fingerprinted, scored)
  checks/index.html        How it's checked
  assets/                  tarin.css, tarin.js, logo.svg, favicon.svg
  data/                    written by ../build_www.py — don't edit by hand
```

## Update the data

After a new annex workbook is pulled:

```
python3 tarin_annex.py pull          # from the tarin folder
python3 tarin_forecast.py score      # score earlier forecasts against the new month
python3 tarin_forecast.py make       # freeze the next forecast (once per data month)
python3 site/build_site.py           # optional: see which story figures moved
python3 site/build_www.py            # rewrite site/www/data from tarin.db (the catalogue too)
```

The other StatsBank tables load with `python3 tarin_statsbank.py sync`, which also runs
their checks. `build_www.py` calls `build_tables.py`, which writes `data/tables.json`,
`data/tables/<table>.json` and `data/csv/tables/<table>.csv`.

Run `make` straight after `pull`, before anything else is published, so the forecast
file's timestamp and fingerprint predate GSS's next release.

`build_www.py` publishes only values with no open hold. A held value is written as a
gap, with the rule that holds it, so the charts show the gap and say why.

The data story's prose is written by hand. When `build_site.py` lists changed
figures, check any sentence in price-record/index.html that quotes one.

## Look at it locally

Pages load their data with fetch(), which browsers block on file:// pages. Serve the folder:

```
cd site/www && python3 -m http.server 8000
```

then open http://localhost:8000.

## Put it online

The folder is the whole site. Two free options:

- **Netlify**: drag the www folder onto app.netlify.com/drop.
- **GitHub Pages**: push www/ to a repository and turn on Pages for it.

For tarinapp.com, re-register the domain, then point it at the host (both hosts
explain the DNS records). tarinapp.com stopped resolving some time before September 2026.

## Brand

From the original TARIN (2021): the blue serif T (#275AEB) on an ice-blue hexagon
(#BFDAF7 to #A0E2F0), the slate hex banner (#B4C2CB), and the black-and-navy
(#223A6C) chart cards. Type: IBM Plex Serif, Sans and Mono. Chart colours, validated
for colour-blind readers (three series at most): #275AEB, #E0762F, #1F9E89 (light);
#5B86F5, #D9692A, #26A88F (dark).
