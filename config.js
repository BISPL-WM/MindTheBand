/* Public page (arXiv preprint). tools/make_zip.sh copies this file over config.js in the public archive only; the review
   copy keeps site/config.js (public: false) and must never contain names. */
window.MTB_SITE = {
  public: true,
  webm: true,
  title: 'Mind the Band: The Hidden Frequency Variable in Geometric RoPE',
  venue: 'arXiv:2611.32171',
  authors: [
    { name: 'Seonghyun Jin', mark: '*', url: 'https://jinotter3.github.io/' },
    { name: 'Youngmin Kim', mark: '*', url: 'https://ggred0123.github.io/' },
    { name: 'Jong Chul Ye', mark: '&dagger;', url: 'https://bispl-website.github.io/professor/' }
  ],
  affiliations: ['Kim Jaechul Graduate School of Artificial Intelligence, KAIST'],
  notes: '<sup>*</sup>Equal contribution &middot; <sup>&dagger;</sup>Corresponding author',
  links: [
    { label: 'Paper', href: 'paper.pdf' },
    { label: 'arXiv', href: 'https://arxiv.org/abs/2611.32171' },
    { label: 'Code', soon: true }
  ],
  bibtex: '@article{jin2026mindtheband,\n  title   = {Mind the Band: The Hidden Frequency Variable in Geometric {RoPE}},\n  author  = {Jin, Seonghyun and Kim, Youngmin and Ye, Jong Chul},\n  journal = {arXiv preprint arXiv:2611.32171},\n  year    = {2026}\n}',
  footer: 'Mind the Band: The Hidden Frequency Variable in Geometric RoPE · arXiv:2611.32171'
};
