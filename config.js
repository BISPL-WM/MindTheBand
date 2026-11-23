/* Public page (preprint). tools/make_zip.sh copies this file over config.js in the public archive only; the review
   copy keeps site/config.js (public: false) and must never contain names. */
window.MTB_SITE = {
  public: true,
  webm: true,
  title: 'Mind the Band: The Hidden Frequency Variable in Geometric RoPE',
  venue: 'Preprint',
  authors: [
    { name: 'Seonghyun Jin', mark: '*', url: 'https://jinotter3.github.io/' },
    { name: 'Youngmin Kim', mark: '*', url: 'https://ggred0123.github.io/' },
    { name: 'Jong Chul Ye', mark: '&dagger;', url: 'https://bispl-website.github.io/professor/' }
  ],
  affiliations: ['Kim Jaechul Graduate School of Artificial Intelligence, KAIST'],
  notes: '<sup>*</sup>Equal contribution &middot; <sup>&dagger;</sup>Corresponding author',
  links: [{ label: 'Paper', href: 'paper.pdf' }, { label: 'arXiv', soon: true }, { label: 'Code', soon: true }],
  bibtex: '@misc{jin2026mindtheband,\n  title  = {Mind the Band: The Hidden Frequency Variable in Geometric {RoPE}},\n  author = {Jin, Seonghyun and Kim, Youngmin and Ye, Jong Chul},\n  year   = {2026},\n  note   = {Preprint}\n}',
  footer: 'Mind the Band: The Hidden Frequency Variable in Geometric RoPE. Preprint.'
};
