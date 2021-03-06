var dom = new Proxy((() => {
  var initial = str => {
    var div = document.createElement('div');
    div.innerHTML = str;
    return Array.from(div.childNodes);
  };

  initial.set = (nodes, value) => {
    if (typeof value === 'string') {
      value = dom(value);
    }
    if (value instanceof Array) {
      value = value.reduce((frag, val) => {
        frag.appendChild(val).parentNode;
        return frag;
      }, document.createDocumentFragment());
    }
    nodes.forEach(node => node.parentNode.replaceChild(value, node));
    return true;
  }

  initial.get = (base, key) => {
    switch(key) {
      case 'id':
        return new Proxy(base, {
          get: (t, key) => dom['#' + key],
          set: (t, key, value) => { dom['#' + key] = value; return true; },
          deleteProperty: (t, key) => { delete dom['#' + key]; return true; }
        });
        break;
      case 'class':
        return new Proxy(base, {
          get: (t, key) => dom['.' + key],
          set: (t, key, value) => { dom['.' + key] = value; return true; },
          deleteProperty: (t, key) => { delete dom['.' + key]; return true; }
        });
        break;
      case 'attr':
        return new Proxy(base, {
          get: (t, key) => dom[`[${key}]`],
          set: (t, key, value) => { dom[`[${key}]`] = value; return true; },
          deleteProperty: (t, key) => { delete dom[`[${key}]`]; return true; }
        });
        break;
      default:
        if (/^\s*\</.test(key)) return dom(key);
        var objs = Array.from(document.querySelectorAll(key));
        return new Proxy(objs, base.dom_handler);
    }
  }

  initial.dom_attr_handler = {
    get: (els, key) => els[0].getAttribute(key),
    set: (els, key, value) => !els.forEach((el, i) => {
      var auto = typeof value === 'string' ? () => value : value;
      el.setAttribute(key, auto(el.getAttribute(key) || '', i, el));
    }),
    deleteProperty: (els, key) => !els.forEach(el => el.removeAttribute(key))
  }

  initial.dom_class_handler = {
    // GET dom.a.class.bla; SET dom.a.class.bla = true; DELETE dom.a.class.bla
    get: (els, key) => els.filter(el => el.classList.contains(key)).length > 0,
    set: (els, key, value) => !els.forEach(el => el.classList[value ? 'add' : 'remove'](key)),
    deleteProperty: (els, key) => !els.forEach(el => el.classList.remove(key))
  }

  var dom_proxies = {
    attr: initial.dom_attr_handler,
    class: initial.dom_class_handler
  };
  var attr_alias = { html: 'innerHTML' };

  // GET dom.a.html; SET dom.a.html = 5; DELETE dom.a.html
  initial.dom_handler = {
    get: (els, key) => {
      if (els[key]) return els[key]; // keep array functions
      if (!els.length) return;
      if (key in dom_proxies) return new Proxy(els, dom_proxies[key]);
      if (key in attr_alias) key = attr_alias[key];
      return els[0][key];
    },
    set: (els, key, value) => {
      if (els[key]) return els[key]; // keep array functions
      if (!els.length) return;
      if (key in attr_alias) key = attr_alias[key];
      var auto = typeof value === 'string' ? v => value : value;
      var setEach = (el, i) => el[key] = auto(el[key], i);
      if (key === 'class') setEach = (el, i) => el.classList.add(value);
      els.forEach(setEach);
    },
    deleteProperty: (els, key) => {
      if (els[key]) return els[key]; // keep array functions
      if (!els.length) return;
      if (key in attr_alias) key = attr_alias[key];
      els.forEach(el => el[key] = '');
      return true;
    }
  };

  return initial;
})(), {
  get: (base, key) => base.get(base, key),
  set: (base, key, value) => base.set(dom[key], value),
  deleteProperty: (base, key) => dom[key].forEach(n => n.remove())
});
