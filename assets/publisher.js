(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./workbook.js'));
  else root.LANPublisher = factory(root.LANWorkbook);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (W) {
  'use strict';
  const repository = 'sodbileg0001-oss/lan-stats', branch = 'main';
  const endpoint = 'https://api.github.com/repos/' + repository;
  const fileURL = endpoint + '/contents/assets/data.js';
  function encode(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  }
  function decode(text) { return new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s/g, '')), c => c.charCodeAt(0))); }
  async function publish(data, token, expectedRevision, request = globalThis.fetch) {
    W.validate(data);
    if (!token || /\s/.test(token)) throw new Error('Enter a GitHub publishing token with Contents: Read and write access to lan-stats.');
    const headers = { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token };
    async function call(url, options = {}) {
      let response;
      try { response = await request(url, { ...options, headers: { ...headers, ...options.headers }, cache: 'no-store', signal: AbortSignal.timeout(30000) }); }
      catch { throw new Error(options.method === 'PUT' ? 'Publishing could not be confirmed. Check the latest GitHub commit before trying again.' : 'Could not reach GitHub. Check your connection and try again.'); }
      if (!response.ok) {
        if (response.status === 409 || response.status === 422) throw new Error('The shared data changed or this branch requires a pull request. Refresh the site and review the latest data before publishing again.');
        if ([401, 403, 404].includes(response.status)) throw new Error('GitHub did not allow publishing. Check that your token has Contents: Read and write access to sodbileg0001-oss/lan-stats and has not expired.');
        throw new Error('GitHub could not complete this update. Try again later.');
      }
      return response.json();
    }
    const remote = await call(fileURL + '?ref=' + branch);
    if (!/^[a-f\d]{40}$/i.test(remote.sha || '')) throw new Error('GitHub returned an invalid file revision.');
    const blob = remote.encoding === 'base64' ? remote : await call(endpoint + '/git/blobs/' + remote.sha);
    const current = W.deserialize(decode(blob.content));
    if (W.revision(current) !== expectedRevision) throw new Error('A newer workbook has already been published. Wait for the site to refresh, then select your file and review it again.');
    const saved = await call(fileURL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch, sha: remote.sha, message: 'Update LAN statistics from Excel (' + data.matches.length + ' matches)', content: encode(W.serialize(data)) }) });
    if (!/^[a-f\d]{40}$/i.test(saved.commit?.sha || '')) throw new Error('The publishing response could not be confirmed. Check GitHub before trying again.');
    return { sha: saved.commit.sha, url: 'https://github.com/' + repository + '/commit/' + saved.commit.sha };
  }
  return { publish, repository, branch };
});
