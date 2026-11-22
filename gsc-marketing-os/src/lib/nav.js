export const navigate = (page, param) => { window.location.hash = '/' + page + (param ? '/' + param : '') }
