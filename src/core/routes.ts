/** Keep navigation relative to the containing static-site deployment directory. */
function directory(url: URL): URL {
  const result = new URL(url);
  if (result.pathname.endsWith('/index.html')) {
    result.pathname = result.pathname.slice(0, -'index.html'.length);
  } else if (!result.pathname.endsWith('/')) {
    result.pathname += '/';
  }
  return result;
}

function destination(relative: string, current: URL): URL {
  const result = new URL(relative, directory(current));
  result.search = current.search;
  result.searchParams.delete('dev');
  result.hash = current.hash;
  return result;
}

export function previewerUrl(gamePage: URL): URL {
  return destination('dev/', gamePage);
}

export function gameUrl(previewerPage: URL): URL {
  return destination('../', previewerPage);
}
