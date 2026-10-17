/**
 * 本文件由 packages/JSONViewer 构建生成，请勿直接修改
 * 仓库地址：https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes
 */
"use strict";

// node_modules/preact/dist/preact.mjs
var n, t, i, r, u, f, o, e, l, c, a, s, h = {}, p = [], v = /^m(i|n|o|s|text|space)$/, y = Array.isArray, d = p.slice, w = Object.assign;
function _(n2) {
  n2 && n2.parentNode && n2.remove();
}
function g(n2, t3, i3) {
  var r3, u4, f3, o4 = {}, e3 = arguments.length;
  for (f3 in t3) f3 == "key" ? r3 = t3[f3] : f3 == "ref" && typeof n2 != "function" ? u4 = t3[f3] : o4[f3] = t3[f3];
  return e3 > 2 && (o4.children = e3 > 3 ? d.call(arguments, 2) : i3), b(n2, o4, r3, u4, null);
}
function k(n2, t3, i3) {
  var r3, u4, f3, o4 = w({}, n2.props), e3 = arguments.length;
  for (f3 in t3) f3 == "key" ? r3 = t3[f3] : f3 == "ref" && typeof n2.type != "function" ? u4 = t3[f3] : o4[f3] = t3[f3];
  return e3 > 2 && (o4.children = e3 > 3 ? d.call(arguments, 2) : i3), b(n2.type, o4, r3 !== void 0 ? r3 : n2.key, u4 !== void 0 ? u4 : n2.ref, null);
}
function b(i3, r3, u4, f3, o4) {
  var e3 = { type: i3, props: r3, key: u4, ref: f3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: o4 || ++t, __i: -1, __u: 0 };
  return !o4 && n.vnode && n.vnode(e3), e3;
}
function m() {
  return { current: null };
}
function M(n2) {
  return n2.children;
}
function $2(n2, t3) {
  this.props = n2, this.context = t3, this.__g = 0;
}
function x(n2, t3) {
  if (t3 == null) return n2.__ ? x(n2.__, n2.__i + 1) : null;
  for (var i3; t3 < n2.__k.length; t3++) if ((i3 = n2.__k[t3]) && i3.__e) return i3.__e;
  return typeof n2.type != "function" || n2.props.__P ? null : x(n2);
}
function S(n2) {
  if ((n2 = n2.__) && n2.__c && !n2.props.__P) return n2.__e = null, n2.__k.some(function(t3) {
    return t3 && (n2.__e = t3.__e);
  }), S(n2);
}
function C(t3) {
  (8 & t3.__g || !(t3.__g |= 8) || !r.push(t3) || f++) && u == n.debounceRendering || ((u = n.debounceRendering) || queueMicrotask)(j);
}
function j() {
  var t3, i3, u4, e3, l3, c3, a3, s3, h3;
  try {
    for (i3 = 1; r.length; ) r.length > i3 && r.sort(o), t3 = r.shift(), i3 = r.length, 8 & t3.__g && (e3 = void 0, l3 = void 0, c3 = (l3 = (u4 = t3).__v).__e, a3 = [], s3 = [], (h3 = u4.__P) && ((e3 = w({ constructor: void 0 }, l3)).__v = l3.__v + 1, n.vnode && n.vnode(e3), N(h3, e3, l3, u4.__n, h3.namespaceURI, 32 & l3.__u ? [c3] : null, a3, c3 || x(l3), 32 & l3.__u, s3), e3.__v = l3.__v, e3.__.__k[e3.__i] = e3, z(a3, e3, s3), l3.__ = l3.__e = null, e3.__e != c3 && S(e3)));
  } finally {
    r.length = f = 0;
  }
}
function L(n2, t3, i3, r3, u4, f3, o4, e3, l3, c3, a3) {
  var s3, v3, y3, d3, w4, _3, g3 = r3.__k || p, k4 = t3.length;
  for (l3 = H(i3, t3, g3, l3, k4), s3 = 0; s3 < k4; s3++) (y3 = i3.__k[s3]) != null && (v3 = ~y3.__i && g3[y3.__i] || h, y3.__i = s3, _3 = N(n2, y3, v3, u4, f3, o4, e3, l3, c3, a3), d3 = y3.__e, (v3.ref != y3.ref || 8 & v3.__u) && (v3.ref && D(v3.ref, null, y3, v3), y3.ref && a3.push(y3.ref, y3.__c || d3, y3)), w4 = w4 || d3, 4 & y3.__u ? (l3 = I(y3, l3, n2, !v3.__v), v3.__e && (v3.__e = null)) : typeof y3.type == "function" && _3 !== void 0 ? l3 = _3 : d3 && (l3 = d3.nextSibling), y3.__u &= -7);
  return i3.__e = w4, l3;
}
function H(n2, t3, i3, r3, u4) {
  var f3, o4, e3, l3, c3, a3, s3, h3, p3, v3, d3 = i3.length, w4 = d3, _3 = 0, g3 = !1, k4 = n2.__k = Array(u4);
  for (f3 = 0; f3 < u4; f3++) (o4 = t3[f3]) != null && typeof o4 != "boolean" && typeof o4 != "function" ? (typeof o4 != "object" || o4.constructor == String ? o4 = k4[f3] = b(null, o4) : y(o4) ? o4 = k4[f3] = b(M, { children: o4 }) : o4.constructor === void 0 && o4.__b ? o4 = k4[f3] = b(o4.type, o4.props, o4.key, o4.ref, o4.__v) : k4[f3] = o4, l3 = f3 + _3, o4.__ = n2, o4.__b = n2.__b + 1, e3 = null, ~(c3 = o4.__i = O(o4, i3, l3, w4)) && (w4--, (e3 = i3[c3]) && (e3.__u |= 2)), e3 && e3.__v ? (o4.__u |= 2, c3 == l3 - 1 ? _3-- : c3 == l3 + 1 ? _3++ : c3 != l3 && (c3 > l3 ? _3-- : _3++, g3 = !0)) : (~c3 || (u4 > d3 ? _3-- : u4 < d3 && _3++), typeof o4.type != "function" && (o4.__u |= 4))) : k4[f3] = null;
  if (g3) {
    for (a3 = [], s3 = [], f3 = 0; f3 < u4; f3++) if ((o4 = k4[f3]) && 2 & o4.__u) {
      for (h3 = 0, p3 = a3.length; h3 < p3; ) a3[v3 = h3 + p3 >> 1] < o4.__i ? h3 = v3 + 1 : p3 = v3;
      a3[h3] = o4.__i, s3[f3] = h3 + 1;
    }
    for (_3 = a3.length; f3--; ) s3[f3] && (s3[f3] == _3 ? _3-- : k4[f3].__u |= 4);
  }
  if (w4) for (f3 = 0; f3 < d3; f3++) !(e3 = i3[f3]) || 2 & e3.__u || (e3.__e == r3 && (r3 = x(e3)), E(e3, e3));
  return r3;
}
function I(n2, t3, i3, r3) {
  var u4, f3, o4;
  if (typeof n2.type == "function") {
    if (n2.props.__P) return t3;
    if (u4 = n2.__k) for (f3 = 0; f3 < u4.length; f3++) u4[f3] && (u4[f3].__ = n2, t3 = I(u4[f3], t3, i3, !1));
    return t3;
  }
  for (t3 && !t3.parentNode && (t3 = x(n2)) && !t3.parentNode && (t3 = null), o4 = t3; o4 && o4.nodeType == 8; ) o4 = o4.nextSibling;
  for (n2.__e != o4 && (!r3 && i3.moveBefore && n2.__e.parentNode ? i3.moveBefore(n2.__e, t3) : i3.insertBefore(n2.__e, t3 || null)), t3 = n2.__e; (t3 = t3 && t3.nextSibling) && t3.nodeType == 8; ) ;
  return t3;
}
function A(n2, t3) {
  return t3 = t3 || [], n2 != null && typeof n2 != "boolean" && (y(n2) ? n2.some(function(n3) {
    A(n3, t3);
  }) : t3.push(n2)), t3;
}
function O(n2, t3, i3, r3) {
  var u4, f3, o4, e3 = n2.key, l3 = n2.type, c3 = t3[i3], a3 = c3 && !(2 & c3.__u);
  if (c3 === null && e3 == null || a3 && e3 == c3.key && l3 == c3.type) return i3;
  if (r3 > (a3 ? 1 : 0)) {
    for (u4 = i3 - 1, f3 = i3 + 1; u4 >= 0 || f3 < t3.length; ) if ((c3 = t3[o4 = u4 >= 0 ? u4-- : f3++]) && !(2 & c3.__u) && e3 == c3.key && l3 == c3.type) return o4;
  }
  return -1;
}
function P(n2, t3, i3) {
  i3 == null && (i3 = ""), t3[0] == "-" ? n2.setProperty(t3, i3) : n2[t3] = i3;
}
function T(n2, t3, i3, r3, u4) {
  var f3, o4;
  n: if (t3 == "style") if (typeof i3 == "string") n2.style.cssText = i3;
  else {
    if (typeof r3 == "string" && (n2.style.cssText = r3 = ""), r3) for (t3 in r3) i3 && t3 in i3 || P(n2.style, t3, "");
    if (i3) for (t3 in i3) r3 && i3[t3] == r3[t3] || P(n2.style, t3, i3[t3]);
  }
  else if (t3[0] == "o" && t3[1] == "n") (n2.__e || (n2.__e = {}))[t3] = i3, i3 && r3 || (o4 = a[t3] || (a[t3] = q(t3)), (n2.__a || (n2.__a = {}))[t3] = c, f3 = t3 != (t3 = t3.replace(l, "$1")), (t3 = t3.slice(2))[0] < "a" && (t3 = t3.toLowerCase()), i3 ? n2.addEventListener(t3, o4, f3) : n2.removeEventListener(t3, o4, f3));
  else {
    if (u4 == "http://www.w3.org/2000/svg") t3 = t3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if (t3 != "width" && t3 != "height" && t3 != "href" && t3 != "list" && t3 != "form" && t3 != "tabIndex" && t3 != "download" && t3 != "rowSpan" && t3 != "colSpan" && t3 != "role" && t3 != "popover" && t3 in n2) try {
      n2[t3] = i3 ?? "";
      break n;
    } catch {
    }
    typeof i3 == "function" || (i3 == null || i3 === !1 && t3[4] != "-" ? n2.removeAttribute(t3) : n2.setAttribute(t3, t3 == "popover" && i3 == 1 ? "" : i3));
  }
}
function q(t3) {
  return function(i3) {
    if (this.__e) {
      var r3 = this.__e[t3];
      if (i3[e] == null) i3[e] = c++;
      else if (i3[e] < this.__a[t3]) return;
      return r3(n.event ? n.event(i3) : i3);
    }
  };
}
function N(t3, i3, r3, u4, f3, o4, e3, l3, c3, a3) {
  var s3, h3, v3, d3, g3, k4, b3, m3, S3, C4, j4, H3, I3, A4, O3, P4, T4, q4, N3, z4, D4 = i3.type;
  if (i3.constructor !== void 0) return null;
  if (128 & r3.__u && (c3 = 32 & r3.__u, s3 = r3.__c.__z)) {
    if (i3.__u |= c3, h3 = o4 = [], s3.nodeType == 8) for (v3 = 1, d3 = s3.nextSibling; d3; d3 = d3.nextSibling) {
      if (d3.nodeType == 8) {
        if (d3.data.startsWith("$s")) v3++;
        else if (d3.data.startsWith("/$s") && !--v3) break;
      }
      o4.push(d3);
    }
    else o4.push(s3);
    l3 = o4[0];
  }
  (s3 = n.__b) && s3(i3);
  n: if (typeof D4 == "function") {
    g3 = e3.length;
    try {
      if (C4 = i3.props, j4 = (s3 = D4.prototype) && s3.render, H3 = (s3 = D4.contextType) && u4[s3.__c], I3 = s3 ? H3 ? H3.props.value : s3.__ : u4, r3.__c ? 2 & (k4 = i3.__c = r3.__c).__g && (k4.__g |= 1) : (j4 ? i3.__c = k4 = new D4(C4, I3) : (i3.__c = k4 = new $2(C4, I3), k4.constructor = D4, k4.render = F), H3 && H3.sub(k4), k4.state || (k4.state = {}), k4.__n = u4, k4.__g |= 8, k4.__h = [], k4.__k = []), j4 && (k4.__s || (k4.__s = k4.state), D4.getDerivedStateFromProps && (k4.__s == k4.state && (k4.__s = w({}, k4.__s)), w(k4.__s, D4.getDerivedStateFromProps(C4, k4.__s)))), b3 = k4.props, m3 = k4.state, k4.__v = i3, r3.__c) {
        if (j4 && !D4.getDerivedStateFromProps && C4 !== b3 && k4.componentWillReceiveProps && k4.componentWillReceiveProps(C4, I3), i3.__v == r3.__v && !(8 & k4.__g) || !(4 & k4.__g) && k4.shouldComponentUpdate && k4.shouldComponentUpdate(C4, k4.__s, I3) === !1) {
          i3.__v != r3.__v && (k4.props = C4, k4.state = k4.__s, k4.__g &= -9), i3.__e = r3.__e, i3.__k = r3.__k, i3.__k.some(function(n2) {
            n2 && (n2.__ = i3);
          }), p.push.apply(k4.__h, k4.__k), k4.__k = [], k4.__h.length && e3.push(k4), l3 = x(r3);
          break n;
        }
        k4.componentWillUpdate && k4.componentWillUpdate(C4, k4.__s, I3), j4 && k4.componentDidUpdate && k4.__h.push(function() {
          k4.componentDidUpdate(b3, m3, S3);
        });
      } else j4 && !D4.getDerivedStateFromProps && k4.componentWillMount && k4.componentWillMount(), j4 && k4.componentDidMount && k4.__h.push(k4.componentDidMount);
      if (k4.context = I3, k4.props = C4, k4.__P = t3, k4.__g &= -5, A4 = n.__r, O3 = 0, j4) k4.state = k4.__s, k4.__g &= -9, A4 && A4(i3), s3 = k4.render(k4.props, k4.state, k4.context), p.push.apply(k4.__h, k4.__k), k4.__k = [];
      else do
        k4.__g &= -9, A4 && A4(i3), s3 = k4.render(k4.props, k4.state, k4.context), k4.state = k4.__s;
      while (8 & k4.__g && ++O3 < 25);
      k4.state = k4.__s, k4.getChildContext && (u4 = w({}, u4, k4.getChildContext())), j4 && r3.__c && k4.getSnapshotBeforeUpdate && (S3 = k4.getSnapshotBeforeUpdate(b3, m3)), P4 = s3 && s3.type === M && s3.key == null ? s3.props.children : s3, C4.__P && (s3 = l3, f3 = (t3 = C4.__P).namespaceURI, c3 = o4 = null, r3.props && r3.props.__P != t3 && (r3.__k.some(function(n2) {
        n2 && E(n2, n2);
      }), r3.__k = null), l3 = r3.__k ? x(r3, 0) : null), l3 = L(t3, y(P4) ? P4 : [P4], i3, r3, u4, f3, o4, e3, l3, c3, a3), C4.__P && (i3.__e = null, l3 = s3), i3.__u &= -161, 128 & r3.__u && (k4.__z = null), h3 && h3.some(_), k4.__h.length && e3.push(k4), 1 & k4.__g && (k4.__g &= -4);
    } catch (t4) {
      if (e3.length = g3, i3.__v = null, c3 || o4) if (t4.then) {
        if (T4 = 0, i3.__u |= c3 ? 160 : 128, o4) {
          for (~(N3 = o4.indexOf(l3 || void 0)) || (N3 = o4.length); (z4 = o4[N3 - 1]) && z4.nodeType == 8; ) N3--;
          for (; N3 < o4.length; N3++) if (z4 = o4[N3]) {
            if (o4[N3] = null, z4.nodeType == 8) {
              if (z4.data.startsWith("$s")) T4++ || (q4 = z4);
              else if (T4 && z4.data.startsWith("/$s") && !--T4) {
                l3 = z4;
                break;
              }
            } else if (!T4) break;
          }
        }
        if (!q4) {
          for (; l3 && l3.nodeType == 8 && l3.nextSibling; ) l3 = l3.nextSibling;
          q4 = l3;
        }
        i3.__c.__z || (i3.__c.__z = q4), i3.__e = l3;
      } else o4 && o4.some(_);
      else i3.__e = r3.__e;
      i3.__k || (i3.__k = r3.__k || []), t4.then || V(i3), n.__e(t4, i3, r3);
    }
  } else l3 = i3.__e = B(r3.__e, i3, r3, u4, f3, o4, e3, c3, a3, t3);
  return (s3 = n.diffed) && s3(i3), 128 & i3.__u ? void 0 : l3;
}
function V(n2) {
  n2 && (n2.__c && (n2.__c.__g |= 4), n2.__k && n2.__k.some(V));
}
function z(t3, i3, r3) {
  for (var u4 = 0; u4 < r3.length; ) D(r3[u4++], r3[u4++], r3[u4++]);
  n.__c && n.__c(i3, t3), t3.some(function(i4) {
    try {
      t3 = i4.__h, i4.__h = [], t3.some(function(n2) {
        n2.call(i4);
      });
    } catch (t4) {
      n.__e(t4, i4.__v);
    }
  });
}
function B(t3, i3, r3, u4, f3, o4, e3, l3, c3, a3) {
  var s3, p3, w4, g3, k4, b3, m3, M3, $4, S3 = r3.props || h, C4 = i3.props, j4 = i3.type;
  if (j4 == "svg" ? f3 = "http://www.w3.org/2000/svg" : j4 == "math" ? f3 = "http://www.w3.org/1998/Math/MathML" : f3 || (f3 = "http://www.w3.org/1999/xhtml"), o4) {
    for (s3 = 0; s3 < o4.length; s3++) if ((k4 = o4[s3]) && (j4 ? k4.localName == j4 : k4.nodeType == 3)) {
      t3 = k4, o4[s3] = null;
      break;
    }
  }
  if (!t3) {
    if (M3 = a3.ownerDocument || document, !j4) return M3.createTextNode(C4);
    t3 = M3.createElementNS(f3, j4, C4.is && C4), l3 && (n.__m && n.__m(i3, o4), l3 = !1), o4 = null;
  }
  if (j4) {
    if (a3 = j4 == "template" ? t3.content : t3, o4 = j4 == "textarea" && C4.defaultValue != null ? null : o4 && d.call(a3.childNodes), !l3 && o4) for (S3 = {}, s3 = 0; s3 < t3.attributes.length; s3++) S3[(k4 = t3.attributes[s3]).name] = k4.value;
    for (s3 in S3) k4 = S3[s3], s3 == "dangerouslySetInnerHTML" ? w4 = k4 : s3 == "children" || s3 in C4 || s3 == "value" && "defaultValue" in C4 || s3 == "checked" && "defaultChecked" in C4 || T(t3, s3, null, k4, f3);
    for (s3 in $4 = 1 & r3.__u, C4) k4 = C4[s3], s3 == "children" ? g3 = k4 : s3 == "dangerouslySetInnerHTML" ? p3 = k4 : s3 == "value" ? b3 = k4 : s3 == "checked" ? m3 = k4 : l3 && typeof k4 != "function" || !(S3[s3] !== k4 || $4 && k4 != null) || T(t3, s3, k4, S3[s3], f3);
    p3 ? (l3 || w4 && (p3.__html == w4.__html || p3.__html == t3.innerHTML) || (t3.innerHTML = p3.__html), i3.__k = []) : (w4 && (t3.textContent = ""), (j4 == "foreignObject" || f3 == "http://www.w3.org/1998/Math/MathML" && v.test(j4)) && (f3 = "http://www.w3.org/1999/xhtml"), L(a3, y(g3) ? g3 : [g3], i3, r3, u4, f3, o4, e3, o4 ? o4[0] : r3.__k && x(r3, 0), l3, c3), o4 && o4.some(_)), l3 && j4 != "textarea" || (s3 = "value", j4 == "progress" && b3 == null ? t3.removeAttribute(s3) : b3 == null || b3 === t3[s3] && (j4 != "progress" || b3) || T(t3, s3, b3, S3[s3], f3), s3 = "checked", m3 != null && m3 != t3[s3] && T(t3, s3, m3, S3[s3], f3));
  } else S3 === C4 || l3 && t3.data == C4 || (t3.data = C4);
  return t3;
}
function D(t3, i3, r3, u4) {
  try {
    typeof t3 == "function" ? i3 ? i3.__x = t3(i3) || 1 : u4 && (u4 = u4.__c || u4.__e) && (i3 = u4.__x) && (u4.__x = null, typeof i3 == "function" ? i3() : t3(null)) : t3.current = i3;
  } catch (t4) {
    n.__e(t4, r3);
  }
}
function E(t3, i3, r3) {
  var u4, f3;
  if (n.unmount && n.unmount(t3), !(u4 = t3.ref) || u4.current && u4.current != t3.__e || D(u4, null, i3, t3), u4 = t3.__c) {
    if (u4.componentWillUnmount) try {
      u4.componentWillUnmount();
    } catch (t4) {
      n.__e(t4, i3);
    }
    u4.__P = u4.__n = null;
  }
  if (u4 = t3.__k) for (f3 = 0; f3 < u4.length; f3++) u4[f3] && E(u4[f3], i3, typeof t3.type != "function" || r3 && !t3.props.__P);
  (u4 = t3.__e) && (r3 || _(u4), u4.__e && (u4.__e = null)), t3.__e = t3.__c = t3.__ = null;
}
function F(n2, t3, i3) {
  return this.constructor(n2, i3);
}
function G(t3, i3) {
  var r3, u4, f3, o4;
  n.__ && n.__(t3, i3), i3.nodeType == 9 && (i3 = i3.documentElement), u4 = (r3 = t3 && 32 & t3.__u) ? null : i3.__k, i3.__k = b(M, { children: [t3] }), f3 = [], o4 = [], N(i3, i3.__k, u4 || h, h, i3.namespaceURI, u4 ? null : i3.firstChild ? d.call(i3.childNodes) : null, f3, u4 ? u4.__e : i3.firstChild, r3, o4), z(f3, i3.__k, o4), i3.__k.props.children = null;
}
function J(n2, t3) {
  n2 && typeof n2 == "object" && (n2.__u |= 32), G(n2, t3);
}
function K(n2) {
  function t3(n3) {
    var i3, r3;
    return this.getChildContext || (i3 = /* @__PURE__ */ new Set(), (r3 = {})[t3.__c] = this, this.getChildContext = function() {
      return r3;
    }, this.shouldComponentUpdate = function(n4) {
      this.props.value != n4.value && i3.forEach(function(n5) {
        n5.__g |= 4, C(n5);
      });
    }, this.sub = function(n4) {
      i3.add(n4);
      var t4 = n4.componentWillUnmount;
      n4.componentWillUnmount = function() {
        i3.delete(n4), t4 && t4.call(n4);
      };
    }), n3.children;
  }
  return t3.__c = "__cC" + s++, t3.__ = n2, t3.Provider = (t3.Consumer = function(n3, t4) {
    return n3.children(t4);
  }).contextType = t3, t3;
}
function Q(n2) {
  return n2.children;
}
function R(n2, t3) {
  return b(Q, { __P: t3, children: n2 });
}
n = { __e: function(n2, t3, i3, r3) {
  for (var u4, o4, e3; t3 = t3.__; ) if ((u4 = t3.__c) && !(1 & u4.__g)) {
    u4.__g |= 4;
    try {
      if ((o4 = u4.constructor) && o4.getDerivedStateFromError && (u4.setState(o4.getDerivedStateFromError(n2)), e3 = 8 & u4.__g), u4.componentDidCatch && (u4.componentDidCatch(n2, r3 || {}), e3 = 8 & u4.__g), e3) return void (u4.__g |= 2);
    } catch (t4) {
      n2 = t4, e3 = 0;
    }
  }
  throw f = 0, n2;
} }, t = 0, i = function(n2) {
  return n2 != null && n2.constructor === void 0;
}, $2.prototype.setState = function(n2, t3) {
  var i3 = this.__s;
  i3 && i3 != this.state || (i3 = this.__s = w({}, this.state)), typeof n2 == "function" && (n2 = n2(w({}, i3), this.props)), n2 && (w(i3, n2), this.__v && (t3 && this.__k.push(t3), C(this)));
}, $2.prototype.forceUpdate = function(n2) {
  this.__v && (this.__g |= 4, n2 && this.__h.push(n2), C(this));
}, $2.prototype.render = M, r = [], f = 0, o = function(n2, t3) {
  return n2.__v.__b - t3.__v.__b;
}, e = /* @__PURE__ */ Symbol(), l = /(PointerCapture)$|Capture$/i, c = 0, a = {}, s = 0;

// node_modules/preact/hooks/dist/hooks.mjs
var t2, r2, u2, i2, o2 = Object.is, f2 = 0, c2 = [], e2 = [], a2 = n, v2 = a2.__b, l2 = a2.__r, m2 = a2.diffed, s2 = a2.__c, h2 = a2.unmount, p2 = a2.__;
function y2(n2, t3) {
  a2.__h && a2.__h(r2, n2, f2 || t3), f2 = 0;
  var u4 = r2.__H || (r2.__H = { __: [], __h: [] });
  return n2 >= u4.__.length && u4.__.push({}), u4.__[n2];
}
function d2(n2) {
  return f2 = 1, _2(G2, n2);
}
function _2(n2, u4, i3) {
  var f3 = y2(t2++, 2);
  if (f3.t = n2, !f3.__c && (f3.__ = [i3 ? i3(u4) : G2(void 0, u4), function(n3) {
    var t3 = f3.__N ? f3.__N[0] : f3.__[0], r3 = f3.t(t3, n3);
    o2(t3, r3) || (f3.__N = [r3, f3.__[1]], f3.__c.setState({}));
  }], f3.__c = r2, !r2.__f)) {
    r2.__f = !0;
    var c3 = r2.shouldComponentUpdate;
    r2.shouldComponentUpdate = function(n3, t3, r3) {
      var u5 = this.__H;
      if (!u5) return !0;
      var i4 = !1, f4 = this.props != n3;
      if (u5.__.some(function(n4) {
        n4.__N && (i4 = !0, o2(n4.__[0], n4.__N[0]) || (f4 = !0));
      }), c3) {
        var e3 = c3.call(this, n3, t3, r3);
        return i4 ? e3 || f4 : e3;
      }
      return !i4 || f4;
    };
  }
  return f3.__;
}
function A2(n2, u4) {
  var i3 = y2(t2++, 3);
  !a2.__s && E2(i3.__H, u4) && (i3.__P = !0, i3.__ = n2, i3.u = u4, r2.__H.__h.push(i3));
}
function F2(n2, u4) {
  var i3 = y2(t2++, 4);
  !a2.__s && E2(i3.__H, u4) && (i3.__P = !1, i3.__ = n2, i3.u = u4, r2.__h.push(i3));
}
function T2(n2) {
  return f2 = 5, b2(function() {
    return { current: n2 };
  }, []);
}
function q2(n2, t3, r3) {
  f2 = 6, F2(function() {
    if (typeof n2 == "function") {
      var r4 = n2(t3());
      return function() {
        n2(null), r4 && typeof r4 == "function" && r4();
      };
    }
    if (n2) return n2.current = t3(), function() {
      return n2.current = null;
    };
  }, r3 == null ? r3 : r3.concat(n2));
}
function b2(n2, r3) {
  var u4 = y2(t2++, 7);
  return E2(u4.__H, r3) && (u4.__ = n2(), u4.__H = r3), u4.__;
}
function j2(n2, t3) {
  return f2 = 8, b2(function() {
    return n2;
  }, t3);
}
function w2(n2) {
  var u4 = r2.context[n2.__c], i3 = y2(t2++, 9);
  return i3.c = n2, u4 ? (i3.__ == null && (i3.__ = !0, u4.sub(r2)), u4.props.value) : n2.__;
}
function x2(n2, t3) {
  a2.useDebugValue && a2.useDebugValue(t3 ? t3(n2) : n2);
}
function P2() {
  var n2 = y2(t2++, 11);
  if (!n2.__) {
    for (var u4 = r2.__v; !u4.__m && u4.__; ) u4 = u4.__;
    var i3 = u4.__m || (u4.__m = [0, 0]);
    n2.__ = "P" + i3[0] + "-" + i3[1]++;
  }
  return n2.__;
}
function g2() {
  var n2;
  do {
    for (; n2 = e2.shift(); ) try {
      C2(n2);
    } catch (t4) {
      a2.__e(t4, { __: (n2 = n2.__P) && n2.__v });
    }
    for (; n2 = c2.shift(); ) {
      var t3 = n2.__H;
      if (n2.__P && t3) try {
        t3.__h.some(C2), t3.__h.some(D2), t3.__h = [];
      } catch (r3) {
        t3.__h = [], a2.__e(r3, n2.__v);
      }
    }
  } while (e2.length);
}
a2.__b = function(n2) {
  r2 = null, v2 && v2(n2);
}, a2.__ = function(n2, t3) {
  n2 && t3.__k && t3.__k.__m && (n2.__m = t3.__k.__m), p2 && p2(n2, t3);
}, a2.__r = function(n2) {
  l2 && l2(n2), t2 = 0;
  var i3 = (r2 = n2.__c).__H;
  i3 && (u2 == r2 ? r2.__h = [] : (i3.__h.some(C2), i3.__h.some(D2), t2 = 0), i3.__h = [], i3.__.some(function(n3) {
    n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
  })), u2 = r2;
}, a2.diffed = function(n2) {
  m2 && m2(n2);
  var t3 = n2.__c;
  t3 && t3.__H && (t3.__H.__h.length && B2(c2.push(t3)), t3.__H.__.some(function(n3) {
    n3.u && (n3.__H = n3.u);
  })), u2 = r2 = null;
}, a2.__c = function(n2, t3) {
  t3.some(function(n3) {
    try {
      n3.__h.some(C2), n3.__h = n3.__h.filter(function(n4) {
        return !n4.__ || D2(n4);
      });
    } catch (r3) {
      t3.some(function(n4) {
        n4.__h && (n4.__h = []);
      }), t3 = [], a2.__e(r3, n3.__v);
    }
  }), s2 && s2(n2, t3);
}, a2.unmount = function(n2) {
  h2 && h2(n2);
  var t3, r3, u4 = n2.__c;
  u4 && u4.__H && (u4.__H.__.some(function(u5) {
    try {
      if (u5.__P && u5.__c) {
        if (r3 === void 0) {
          for (r3 = n2.__; r3 && (!r3.__c || !r3.__c.__P); ) r3 = r3.__;
          r3 = r3 && r3.__c;
        }
        u5.__P = r3, B2(e2.push(u5));
      } else C2(u5);
    } catch (n3) {
      t3 = n3;
    }
  }), u4.__H = void 0, t3 && a2.__e(t3, u4.__v));
};
var k2 = typeof requestAnimationFrame == "function";
function z2(n2) {
  var t3, r3 = function() {
    clearTimeout(u4), k2 && cancelAnimationFrame(t3), setTimeout(n2);
  }, u4 = setTimeout(r3, 35);
  k2 && (t3 = requestAnimationFrame(r3));
}
function B2(n2) {
  n2 != 1 && i2 == a2.requestAnimationFrame || ((i2 = a2.requestAnimationFrame) || z2)(g2);
}
function C2(n2) {
  var t3 = r2, u4 = n2.__c;
  typeof u4 == "function" && (n2.__c = void 0, u4()), r2 = t3;
}
function D2(n2) {
  var t3 = r2;
  n2.__c = n2.__(), r2 = t3;
}
function E2(n2, t3) {
  return !n2 || n2.length != t3.length || t3.some(function(t4, r3) {
    return !o2(t4, n2[r3]);
  });
}
function G2(n2, t3) {
  return typeof t3 == "function" ? t3(n2) : t3;
}

// node_modules/preact/compat/dist/compat.mjs
var S2 = function(t3, e3, r3) {
  return t3 == null ? null : A(A(t3).map(e3.bind(r3)));
}, C3 = { map: S2, forEach: S2, count: function(t3) {
  return t3 ? A(t3).length : 0;
}, only: function(t3) {
  var e3 = A(t3);
  if (e3.length != 1) throw "Children.only";
  return e3[0];
}, toArray: A }, w3 = Object.assign;
function R2(n2, t3) {
  for (var e3 in n2) if (e3 != "__source" && n2[e3] !== t3[e3]) return !0;
  for (var r3 in t3) if (r3 != "__source" && !(r3 in n2)) return !0;
  return !1;
}
var x3 = /^(-|f[lo].*[^se]$|g.{5,}[^ps]$|z|o[pr]|(W.{5})?[lL]i.*(t|mp)$|an|(bo|s).{4}Im|sca|m.{6}[ds]|ta|c.*[st]$|wido|ini)/;
function O2() {
  function n2(n3, t3) {
    this.props = n3, this.context = t3;
  }
  return (n2.prototype = new $2()).isPureReactComponent = !0, n2.prototype.shouldComponentUpdate = function(n3, t3) {
    return R2(this.props, n3) || R2(this.state, t3);
  }, n2;
}
var I2 = /* @__PURE__ */ O2(), j3 = /* @__PURE__ */ Symbol.for("react.forward_ref");
function k3(n2) {
  function t3(t4) {
    var e3 = w3({}, t4);
    return delete e3.ref, n2(e3, t4.ref || null);
  }
  return t3.$$typeof = j3, t3.render = n2, t3.prototype.isReactComponent = !0, t3.displayName = "ForwardRef(" + (n2.displayName || n2.name) + ")", t3;
}
function M2(n2) {
  n2();
}
function D3(n2) {
  return n2;
}
function F3() {
  return [!1, M2];
}
var L2 = F2;
function N2(n2) {
  var t3 = T2(n2);
  return t3.current = n2, function() {
    return t3.current.apply(void 0, arguments);
  };
}
function A3(n2, t3) {
  function r3(n3) {
    var e3 = this.props.ref;
    return e3 != n3.ref && e3 && (typeof e3 == "function" ? e3(null) : e3.current = null), t3 ? !t3(this.props, n3) || e3 != n3.ref : R2(this.props, n3);
  }
  function u4(t4) {
    return this.shouldComponentUpdate = r3, g(n2, t4);
  }
  return u4.displayName = "Memo(" + (n2.displayName || n2.name) + ")", u4.prototype.isReactComponent = !0, u4.type = n2, u4;
}
function U(n2, t3) {
  var e3 = R(n2, t3);
  return e3.containerInfo = t3, e3;
}
var V2, T3, W, P3 = /* @__PURE__ */ Symbol.for("react.element"), $3 = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(?!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/, z3 = /[A-Z0-9]/g, H2 = typeof document < "u", Z = /* @__PURE__ */ X(function(n2, t3, e3) {
  var r3 = n.__s || T3 ? (e3 || t3)() : t3(), i3 = d2({ t: { __: r3, u: t3 } }), o4 = i3[0].t, f3 = i3[1];
  return F2(function() {
    o4.__ = r3, o4.u = t3, B3(o4) && f3({ t: o4 });
  }, [n2, r3, t3]), A2(function() {
    return B3(o4) && f3({ t: o4 }), n2(function() {
      B3(o4) && f3({ t: o4 });
    });
  }, [n2]), r3;
});
function B3(n2) {
  try {
    return !Object.is(n2.__, n2.u());
  } catch {
    return !0;
  }
}
var Y = function(n2) {
  return /fil|che|rad/.test(n2);
};
function q3(n2, t3, e3) {
  return t3.__k == null && (t3.textContent = ""), G(n2, t3), typeof e3 == "function" && e3(), n2 ? n2.__c : null;
}
function G3(n2, t3, e3) {
  return J(n2, t3), typeof e3 == "function" && e3(), n2 ? n2.__c : null;
}
$2.prototype.isReactComponent = !0, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(n2) {
  Object.defineProperty($2.prototype, n2, { configurable: !0, get: function() {
    return this["UNSAFE_" + n2];
  }, set: function(t3) {
    Object.defineProperty(this, n2, { configurable: !0, writable: !0, value: t3 });
  } });
});
var J2 = n.event;
n.event = function(n2) {
  return J2 && (n2 = J2(n2)), n2.persist = function() {
  }, n2.isPropagationStopped = function() {
    return this.cancelBubble;
  }, n2.isDefaultPrevented = function() {
    return this.defaultPrevented;
  }, n2.nativeEvent = n2;
};
var K2 = { configurable: !0, get: function() {
  return this.class;
} }, Q2 = n.vnode;
function X(n2) {
  if (!W) {
    W = !0;
    var t3 = n.__r;
    n.__r = function(n3) {
      t3 && t3(n3), 32 & n3.__u && (T3 = n3), V2 = n3.__c;
    };
    var e3 = n.diffed;
    n.diffed = function(n3) {
      e3 && e3(n3), V2 = null, T3 == n3 && (T3 = null);
    };
  }
  return n2;
}
n.vnode = function(t3) {
  if (typeof t3.type == "string") (function(t4) {
    var e4 = t4.props, r4 = t4.type, u4 = {}, i3 = r4.indexOf("-") == -1;
    for (var o4 in e4) {
      var f3 = e4[o4];
      if (!(o4 == "value" && "defaultValue" in e4 && f3 == null || H2 && o4 == "children" && r4 == "noscript" || o4 == "class" || o4 == "className")) {
        if (o4 == "style" && typeof f3 == "object") {
          var c3 = void 0;
          for (var a3 in f3) typeof f3[a3] != "number" || x3.test(a3) || (c3 || (c3 = f3 = w3({}, f3)), f3[a3] += "px");
        } else if (o4 == "defaultValue" && "value" in e4 && e4.value == null) o4 = "value";
        else if (o4 == "download" && f3 === !0) f3 = "";
        else if (o4 == "translate" && f3 === "no") f3 = !1;
        else if (o4[0] == "o" && o4[1] == "n") {
          var l3 = o4.toLowerCase();
          l3 == "ondoubleclick" ? o4 = "ondblclick" : l3 != "onchange" || r4 != "input" && r4 != "textarea" || Y(e4.type) ? l3 == "onfocus" ? o4 = "onfocusin" : l3 == "onblur" && (o4 = "onfocusout") : l3 = o4 = "oninput", l3 == "oninput" && u4[o4 = l3] && (o4 = "oninputCapture");
        } else i3 && $3.test(o4) ? o4 = o4.replace(z3, "-$&").toLowerCase() : f3 === null && (f3 = void 0);
        u4[o4] = f3;
      }
    }
    r4 == "select" && (u4.multiple && Array.isArray(u4.value) && (u4.value = A(e4.children).forEach(function(n2) {
      n2.props.selected = u4.value.indexOf(n2.props.value) != -1;
    })), u4.defaultValue != null && (u4.value = A(e4.children).forEach(function(n2) {
      n2.props.selected = u4.multiple ? u4.defaultValue.indexOf(n2.props.value) != -1 : u4.defaultValue == n2.props.value;
    }))), e4.class && !e4.className ? (u4.class = e4.class, Object.defineProperty(u4, "className", K2)) : e4.className && (u4.class = u4.className = e4.className), t4.props = u4;
  })(t3);
  else if (typeof t3.type == "function" && ("ref" in t3.props && "prototype" in t3.type && t3.type.prototype.render && (t3.ref = t3.props.ref, delete t3.props.ref), t3.type.defaultProps)) {
    var e3 = w3({}, t3.props);
    for (var r3 in t3.type.defaultProps) e3[r3] === void 0 && (e3[r3] = t3.type.defaultProps[r3]);
    t3.props = e3;
  }
  t3.ref && !("ref" in t3.props) && Object.defineProperty(t3.props, "ref", { value: t3.ref, configurable: !0, writable: !0 }), t3.$$typeof = P3, Q2 && Q2(t3);
};
var nn = /* @__PURE__ */ X(function(n2) {
  if (n2.then) {
    if (n2.status == "fulfilled") return n2.value;
    throw n2.status == "rejected" ? n2.reason : (n2.status || (n2.status = "pending", n2.then(function(t4) {
      n2.status = "fulfilled", n2.value = t4;
    }, function(t4) {
      n2.status = "rejected", n2.reason = t4;
    })), n2);
  }
  var t3 = n2.__c, e3 = V2.__n[t3];
  return e3 ? (V2[t3] || (V2[t3] = !0, e3.sub(V2)), e3.props.value) : n2.__;
}), tn = { ReactCurrentDispatcher: { current: { readContext: nn, useCallback: j2, useContext: w2, useDebugValue: x2, useDeferredValue: D3, useEffect: A2, useId: P2, useImperativeHandle: q2, useInsertionEffect: L2, useLayoutEffect: F2, useMemo: b2, useReducer: _2, useRef: T2, useState: d2, useSyncExternalStore: Z, useTransition: F3 } } };
function en(n2, t3, e3) {
  if (n2) {
    var r3 = n2.__c && n2.__c.__H;
    r3 && (r3.__.forEach(function(n3) {
      n3.__P != null && (typeof n3.__c == "function" && n3.__c(), n3.__c = n3.__H = void 0);
    }), r3.__h = n2.__c.__h = []), typeof n2.type == "string" && (n2.__u |= 8), (n2 = w3({ constructor: void 0 }, n2)).__c != null && (n2.__c.__P == e3 && (n2.__c.__P = t3), n2.__c.__g |= 4, n2.__c = n2.ref = null), n2.__k = n2.__k && n2.__k.map(function(n3) {
      return en(n3, t3, e3);
    });
  }
  return n2;
}
function rn(n2, t3, e3) {
  return n2 && e3 && (typeof n2.type == "string" && (n2.__u |= 1), n2.__v = null, n2.__k = n2.__k && n2.__k.map(function(n3) {
    return rn(n3, t3, e3);
  }), n2.__c && n2.__c.__P == t3 && (n2.__e && e3.appendChild(n2.__e), n2.__c.__g |= 4, n2.__c.__P = e3)), n2;
}
function un() {
  function n2() {
    this.__u = 0, this.i = null, this.__b = null;
  }
  return (function() {
    var n3 = n.__e;
    n.__e = function(t4, e3, r3, u4) {
      if (t4.then) {
        for (var i3, o4 = e3; o4 = o4.__; ) if ((i3 = o4.__c) && i3.__c) return r3 && !r3.__c && (e3.__c.__H = void 0), i3.__c(t4, e3);
      }
      n3(t4, e3, r3, u4);
    };
    var t3 = n.unmount;
    n.unmount = function(n4) {
      var e3 = n4.__c;
      e3 && e3.__R && e3.__R(), t3 && t3(n4);
    };
  })(), (n2.prototype = new $2()).__c = function(n3, t3) {
    var e3 = this, r3 = t3.__c;
    this.i == null && (this.i = []), this.i.push(r3);
    var u4 = !1, i3 = function() {
      !u4 && e3.__P && (u4 = !0, r3.__R = null, f3());
    };
    r3.__R = i3;
    var o4 = r3.__P;
    r3.__P = null;
    var f3 = function() {
      if (!--e3.__u) {
        if (e3.state.__a) {
          var n4 = e3.state.__a;
          e3.__v.__k[0] = rn(n4, n4.__c.__P, n4.__c.__O);
        }
        var t4;
        for (e3.setState({ __a: e3.__b = null }); t4 = e3.i.pop(); ) t4.__P = o4, t4.forceUpdate();
      }
    };
    this.__u++ || 32 & t3.__u || this.setState({ __a: this.__b = this.__v.__k[0] }), n3.then(i3, i3);
  }, n2.prototype.componentWillUnmount = function() {
    this.i = [], this.state.__a && (this.__v.__k[0] = this.state.__a);
  }, n2.prototype.render = function(n3, t3) {
    if (this.__b) {
      if (this.__v.__k) {
        var r3 = document.createElement("div"), u4 = this.__v.__k[0].__c;
        this.__v.__k[0] = en(this.__b, r3, u4.__O = u4.__P);
      }
      this.__b = null;
    }
    return [g(M, null, t3.__a ? null : n3.children), t3.__a && g(M, null, n3.fallback)];
  }, n2;
}
var on = /* @__PURE__ */ un();
function fn(n2) {
  var t3, r3, u4, i3 = null;
  function o4(o5) {
    if (t3 || (t3 = n2()).then(function(n3) {
      n3 && (i3 = n3.default || n3), u4 = !0;
    }, function(n3) {
      r3 = n3, u4 = !0;
    }), r3) throw r3;
    if (!u4) throw t3;
    return i3 ? g(i3, o5) : null;
  }
  return o4.displayName = "Lazy", o4;
}
function an(n2) {
  return g.bind(null, n2);
}
function ln(n2) {
  return !!n2 && n2.$$typeof === P3;
}
function sn(n2) {
  return ln(n2) && n2.type == M;
}
function vn(n2) {
  return !!n2 && typeof n2.displayName == "string" && n2.displayName.indexOf("Memo(") == 0;
}
function hn(n2) {
  return ln(n2) ? k.apply(null, arguments) : n2;
}
function dn(n2) {
  return !!n2.__k && (G(null, n2), !0);
}
function pn(n2) {
  return n2 && (n2.__v && n2.__v.__e || n2.nodeType == 1 && n2) || null;
}
var mn = function(n2, t3) {
  var e3, r3 = n.debounceRendering;
  n.debounceRendering = function(n3) {
    e3 = n3;
  };
  try {
    var i3 = n2(t3);
    return e3 && e3(), i3;
  } finally {
    n.debounceRendering = r3;
  }
};
function yn(n2, t3) {
  return n2(t3);
}
var _n = { useState: d2, useId: P2, useReducer: _2, useEffect: A2, useLayoutEffect: F2, useInsertionEffect: L2, useTransition: F3, useDeferredValue: D3, useSyncExternalStore: Z, useEffectEvent: N2, startTransition: M2, useRef: T2, useImperativeHandle: q2, useMemo: b2, useCallback: j2, useContext: w2, use: nn, useDebugValue: x2, version: "19.0.0", Children: C3, render: q3, hydrate: G3, unmountComponentAtNode: dn, createPortal: U, createElement: g, createContext: K, createFactory: an, cloneElement: hn, createRef: m, Fragment: M, isValidElement: ln, isElement: ln, isFragment: sn, isMemo: vn, findDOMNode: pn, Component: $2, PureComponent: I2, memo: A3, forwardRef: k3, flushSync: mn, unstable_batchedUpdates: yn, StrictMode: M, Suspense: on, lazy: fn, __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: tn };

// node_modules/preact/compat/client.mjs
function createRoot(container) {
  return {
    render: function(children) {
      q3(children, container);
    },
    unmount: function() {
      dn(container);
    }
  };
}

// packages/JSONViewer/src/config.ts
var DEFAULT_THEME = "vscode", listeners = /* @__PURE__ */ new Set(), snapshot = { theme: DEFAULT_THEME, dark: void 0 }, recompute = () => {
  snapshot = {
    theme: window.jsonViewerTheme ?? DEFAULT_THEME,
    dark: window.jsonViewerDark
  };
}, notify = () => {
  recompute();
  for (let listener of [...listeners])
    listener();
}, installAccessor = (key, initial) => {
  let descriptor = Reflect.getOwnPropertyDescriptor(window, key);
  if (descriptor && !descriptor.configurable)
    return;
  let value = initial;
  Reflect.defineProperty(window, key, {
    configurable: !0,
    enumerable: !0,
    get: () => value,
    set: (next) => {
      next !== value && (value = next, notify());
    }
  });
}, installed = !1, initConfigStore = () => {
  installed || (installed = !0, installAccessor("jsonViewerTheme", window.jsonViewerTheme), installAccessor("jsonViewerDark", window.jsonViewerDark), recompute());
}, getConfig = () => snapshot, subscribeConfig = (listener) => (listeners.add(listener), () => {
  listeners.delete(listener);
});

// node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
var o3 = 0;
function u3(t3, e3, n2, f3, u4, i3) {
  e3 || (e3 = {});
  var a3, c3, l3 = e3;
  if ("ref" in l3 && typeof t3 != "function") for (c3 in l3 = {}, e3) c3 == "ref" ? a3 = e3[c3] : l3[c3] = e3[c3];
  var p3 = { type: t3, props: l3, key: n2, ref: a3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --o3, __i: -1, __u: 0 };
  return (u4 || i3) && (p3.__source = u4, p3.__self = i3), n.vnode && n.vnode(p3), p3;
}

// node_modules/react18-json-view/dist/es/index.mjs
function __awaiter(thisArg, _arguments, P4, generator) {
  function adopt(value) {
    return value instanceof P4 ? value : new P4(function(resolve) {
      resolve(value);
    });
  }
  return new (P4 || (P4 = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e3) {
        reject(e3);
      }
    }
    function rejected(value) {
      try {
        step(generator.throw(value));
      } catch (e3) {
        reject(e3);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
var toggleSelection = function() {
  var selection = document.getSelection();
  if (!selection.rangeCount)
    return function() {
    };
  for (var active = document.activeElement, ranges = [], i3 = 0; i3 < selection.rangeCount; i3++)
    ranges.push(selection.getRangeAt(i3));
  switch (active.tagName.toUpperCase()) {
    // .toUpperCase handles XHTML
    case "INPUT":
    case "TEXTAREA":
      active.blur();
      break;
    default:
      active = null;
      break;
  }
  return selection.removeAllRanges(), function() {
    selection.type === "Caret" && selection.removeAllRanges(), selection.rangeCount || ranges.forEach(function(range) {
      selection.addRange(range);
    }), active && active.focus();
  };
}, deselectCurrent = toggleSelection, clipboardToIE11Formatting = {
  "text/plain": "Text",
  "text/html": "Url",
  default: "Text"
}, defaultMessage = "Copy to clipboard: #{key}, Enter";
function format(message) {
  var copyKey = (/mac os x/i.test(navigator.userAgent) ? "\u2318" : "Ctrl") + "+C";
  return message.replace(/#{\s*key\s*}/g, copyKey);
}
function copy(text, options) {
  var debug, message, reselectPrevious, range, selection, mark, success = !1;
  options || (options = {}), debug = options.debug || !1;
  try {
    reselectPrevious = deselectCurrent(), range = document.createRange(), selection = document.getSelection(), mark = document.createElement("span"), mark.textContent = text, mark.ariaHidden = "true", mark.style.all = "unset", mark.style.position = "fixed", mark.style.top = 0, mark.style.clip = "rect(0, 0, 0, 0)", mark.style.whiteSpace = "pre", mark.style.webkitUserSelect = "text", mark.style.MozUserSelect = "text", mark.style.msUserSelect = "text", mark.style.userSelect = "text", mark.addEventListener("copy", function(e3) {
      if (e3.stopPropagation(), options.format)
        if (e3.preventDefault(), typeof e3.clipboardData > "u") {
          debug && console.warn("unable to use e.clipboardData"), debug && console.warn("trying IE specific stuff"), window.clipboardData.clearData();
          var format2 = clipboardToIE11Formatting[options.format] || clipboardToIE11Formatting.default;
          window.clipboardData.setData(format2, text);
        } else
          e3.clipboardData.clearData(), e3.clipboardData.setData(options.format, text);
      options.onCopy && (e3.preventDefault(), options.onCopy(e3.clipboardData));
    }), document.body.appendChild(mark), range.selectNodeContents(mark), selection.addRange(range);
    var successful = document.execCommand("copy");
    if (!successful)
      throw new Error("copy command was unsuccessful");
    success = !0;
  } catch (err) {
    debug && console.error("unable to copy using execCommand: ", err), debug && console.warn("trying IE specific stuff");
    try {
      window.clipboardData.setData(options.format || "text", text), options.onCopy && options.onCopy(window.clipboardData), success = !0;
    } catch (err2) {
      debug && console.error("unable to copy using clipboardData: ", err2), debug && console.error("falling back to prompt"), message = format("message" in options ? options.message : defaultMessage), window.prompt(message, text);
    }
  } finally {
    selection && (typeof selection.removeRange == "function" ? selection.removeRange(range) : selection.removeAllRanges()), mark && document.body.removeChild(mark), reselectPrevious();
  }
  return success;
}
var copyToClipboard = copy;
function isObject(node) {
  return Object.prototype.toString.call(node) === "[object Object]";
}
function objectSize(node) {
  return Array.isArray(node) ? node.length : isObject(node) ? Object.keys(node).length : 0;
}
function stringifyForCopying(node, space) {
  if (typeof node == "string")
    return node;
  try {
    return JSON.stringify(node, (key, value) => {
      switch (typeof value) {
        case "bigint":
          return String(value) + "n";
        case "number":
        case "boolean":
        case "object":
        case "string":
          return value;
        default:
          return String(value);
      }
    }, space);
  } catch (error) {
    return `${error.name}: ${error.message}` || "JSON.stringify failed";
  }
}
function writeClipboard(value) {
  return __awaiter(this, void 0, void 0, function* () {
    try {
      yield navigator.clipboard.writeText(value);
    } catch {
      copyToClipboard(value);
    }
  });
}
function isCollapsed(node, depth, indexOrName, collapsed, collapseObjectsAfterLength, customOptions) {
  if (customOptions && customOptions.collapsed !== void 0)
    return !!customOptions.collapsed;
  if (typeof collapsed == "boolean")
    return collapsed;
  if (typeof collapsed == "number" && depth > collapsed)
    return !0;
  let size = objectSize(node);
  if (typeof collapsed == "function") {
    let result = safeCall(collapsed, [{ node, depth, indexOrName, size }]);
    if (typeof result == "boolean")
      return result;
  }
  return !!(Array.isArray(node) && size > collapseObjectsAfterLength || isObject(node) && size > collapseObjectsAfterLength);
}
function isCollapsed_largeArray(node, depth, indexOrName, collapsed, collapseObjectsAfterLength, customOptions) {
  if (customOptions && customOptions.collapsed !== void 0)
    return !!customOptions.collapsed;
  if (typeof collapsed == "boolean")
    return collapsed;
  if (typeof collapsed == "number" && depth > collapsed)
    return !0;
  let size = Math.ceil(node.length / 100);
  if (typeof collapsed == "function") {
    let result = safeCall(collapsed, [{ node, depth, indexOrName, size }]);
    if (typeof result == "boolean")
      return result;
  }
  return !!(Array.isArray(node) && size > collapseObjectsAfterLength || isObject(node) && size > collapseObjectsAfterLength);
}
function ifDisplay(displaySize, depth, fold) {
  return typeof displaySize == "boolean" ? displaySize : !!(typeof displaySize == "number" && depth > displaySize || displaySize === "collapsed" && fold || displaySize === "expanded" && !fold);
}
function safeCall(func, params) {
  try {
    return func(...params);
  } catch (event) {
    reportError(event);
  }
}
function editableAdd(editable) {
  if (editable === !0 || isObject(editable) && editable.add === !0)
    return !0;
}
function editableEdit(editable) {
  if (editable === !0 || isObject(editable) && editable.edit === !0)
    return !0;
}
function editableDelete(editable) {
  if (editable === !0 || isObject(editable) && editable.delete === !0)
    return !0;
}
function isReactComponent(component) {
  return typeof component == "function";
}
function customAdd(customOptions) {
  return !customOptions || customOptions.add === void 0 || !!customOptions.add;
}
function customEdit(customOptions) {
  return !customOptions || customOptions.edit === void 0 || !!customOptions.edit;
}
function customDelete(customOptions) {
  return !customOptions || customOptions.delete === void 0 || !!customOptions.delete;
}
function customCopy(customOptions) {
  return !customOptions || customOptions.enableClipboard === void 0 || !!customOptions.enableClipboard;
}
function customMatchesURL(customOptions) {
  return !customOptions || customOptions.matchesURL === void 0 || !!customOptions.matchesURL;
}
function resolveEvalFailedNewValue(type, value) {
  return type === "string" ? value.trim().replace(/^\"([\s\S]+?)\"$/, "$1") : value;
}
var _path$8;
function _extends$8() {
  return _extends$8 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i3 = 1; i3 < arguments.length; i3++) {
      var source = arguments[i3];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends$8.apply(this, arguments);
}
var SvgAngleDown = function(props) {
  return /* @__PURE__ */ g("svg", _extends$8({
    xmlns: "http://www.w3.org/2000/svg",
    width: 16,
    height: 16,
    fill: "none",
    viewBox: "0 0 16 16"
  }, props), _path$8 || (_path$8 = /* @__PURE__ */ g("path", {
    fill: "currentColor",
    d: "M12.473 5.806a.666.666 0 0 0-.946 0L8.473 8.86a.667.667 0 0 1-.946 0L4.473 5.806a.667.667 0 1 0-.946.94l3.06 3.06a2 2 0 0 0 2.826 0l3.06-3.06a.667.667 0 0 0 0-.94Z"
  })));
}, _path$7;
function _extends$7() {
  return _extends$7 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i3 = 1; i3 < arguments.length; i3++) {
      var source = arguments[i3];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends$7.apply(this, arguments);
}
var SvgCopy = function(props) {
  return /* @__PURE__ */ g("svg", _extends$7({
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    fill: "none",
    viewBox: "0 0 24 24"
  }, props), _path$7 || (_path$7 = /* @__PURE__ */ g("path", {
    fill: "currentColor",
    d: "M17.542 2.5h-4.75a3.963 3.963 0 0 0-3.959 3.958v4.75a3.963 3.963 0 0 0 3.959 3.959h4.75a3.963 3.963 0 0 0 3.958-3.959v-4.75A3.963 3.963 0 0 0 17.542 2.5Zm2.375 8.708a2.378 2.378 0 0 1-2.375 2.375h-4.75a2.378 2.378 0 0 1-2.375-2.375v-4.75a2.378 2.378 0 0 1 2.375-2.375h4.75a2.378 2.378 0 0 1 2.375 2.375v4.75Zm-4.75 6.334a3.963 3.963 0 0 1-3.959 3.958h-4.75A3.963 3.963 0 0 1 2.5 17.542v-4.75a3.963 3.963 0 0 1 3.958-3.959.791.791 0 1 1 0 1.584 2.378 2.378 0 0 0-2.375 2.375v4.75a2.378 2.378 0 0 0 2.375 2.375h4.75a2.378 2.378 0 0 0 2.375-2.375.792.792 0 1 1 1.584 0Z"
  })));
}, _path$6, _path2$5;
function _extends$6() {
  return _extends$6 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i3 = 1; i3 < arguments.length; i3++) {
      var source = arguments[i3];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends$6.apply(this, arguments);
}
var SvgCopied = function(props) {
  return /* @__PURE__ */ g("svg", _extends$6({
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    fill: "none",
    viewBox: "0 0 24 24"
  }, props), _path$6 || (_path$6 = /* @__PURE__ */ g("path", {
    fill: "currentColor",
    d: "M17.25 3H6.75A3.755 3.755 0 0 0 3 6.75v10.5A3.754 3.754 0 0 0 6.75 21h10.5A3.754 3.754 0 0 0 21 17.25V6.75A3.755 3.755 0 0 0 17.25 3Zm2.25 14.25a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25V6.75A2.25 2.25 0 0 1 6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25v10.5Z"
  })), _path2$5 || (_path2$5 = /* @__PURE__ */ g("path", {
    fill: "#14C786",
    d: "M10.312 14.45 7.83 11.906a.625.625 0 0 0-.896 0 .659.659 0 0 0 0 .918l2.481 2.546a1.264 1.264 0 0 0 .896.381 1.237 1.237 0 0 0 .895-.38l5.858-6.011a.658.658 0 0 0 0-.919.625.625 0 0 0-.896 0l-5.857 6.01Z"
  })));
};
function CopyButton({ node, nodeMeta }) {
  let { customizeCopy, CopyComponent, CopiedComponent } = w2(JsonViewContext), [copied, setCopied] = d2(!1), copyHandler = (event) => {
    event.stopPropagation();
    let value = customizeCopy(node, nodeMeta);
    typeof value == "string" && value && writeClipboard(value), setCopied(!0), setTimeout(() => setCopied(!1), 3e3);
  };
  return copied ? typeof CopiedComponent == "function" ? u3(CopiedComponent, { className: "json-view--copy", style: { display: "inline-block" } }) : u3(SvgCopied, { className: "json-view--copy", style: { display: "inline-block" } }) : typeof CopyComponent == "function" ? u3(CopyComponent, { onClick: copyHandler, className: "json-view--copy" }) : u3(SvgCopy, { onClick: copyHandler, className: "json-view--copy" });
}
function NameValue({ indexOrName, value, depth, deleteHandle, editHandle, parent, parentPath }) {
  let { displayArrayIndex } = w2(JsonViewContext), isArray = Array.isArray(parent);
  return u3("div", Object.assign({ className: "json-view--pair" }, { children: [!isArray || isArray && displayArrayIndex ? u3(M, { children: [u3("span", Object.assign({ className: typeof indexOrName == "number" ? "json-view--index" : "json-view--property" }, { children: indexOrName })), ":", " "] }) : u3(M, {}), u3(JsonNode, { node: value, depth: depth + 1, deleteHandle: (indexOrName2, parentPath2) => deleteHandle(indexOrName2, parentPath2), editHandle: (indexOrName2, newValue, oldValue, parentPath2) => editHandle(indexOrName2, newValue, oldValue, parentPath2), parent, indexOrName, parentPath })] }));
}
var _path$5, _path2$4;
function _extends$5() {
  return _extends$5 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i3 = 1; i3 < arguments.length; i3++) {
      var source = arguments[i3];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends$5.apply(this, arguments);
}
var SvgTrash = function(props) {
  return /* @__PURE__ */ g("svg", _extends$5({
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    fill: "none",
    viewBox: "0 0 24 24"
  }, props), _path$5 || (_path$5 = /* @__PURE__ */ g("path", {
    fill: "currentColor",
    d: "M18.75 6h-2.325a3.757 3.757 0 0 0-3.675-3h-1.5a3.757 3.757 0 0 0-3.675 3H5.25a.75.75 0 0 0 0 1.5H6v9.75A3.754 3.754 0 0 0 9.75 21h4.5A3.754 3.754 0 0 0 18 17.25V7.5h.75a.75.75 0 1 0 0-1.5Zm-7.5-1.5h1.5A2.255 2.255 0 0 1 14.872 6H9.128a2.255 2.255 0 0 1 2.122-1.5Zm5.25 12.75a2.25 2.25 0 0 1-2.25 2.25h-4.5a2.25 2.25 0 0 1-2.25-2.25V7.5h9v9.75Z"
  })), _path2$4 || (_path2$4 = /* @__PURE__ */ g("path", {
    fill: "#DA0000",
    d: "M10.5 16.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 1 0-1.5 0v4.5a.75.75 0 0 0 .75.75ZM13.5 16.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 1 0-1.5 0v4.5a.75.75 0 0 0 .75.75Z"
  })));
}, _path$4, _path2$3;
function _extends$4() {
  return _extends$4 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i3 = 1; i3 < arguments.length; i3++) {
      var source = arguments[i3];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends$4.apply(this, arguments);
}
var SvgAddSquare = function(props) {
  return /* @__PURE__ */ g("svg", _extends$4({
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    fill: "none",
    viewBox: "0 0 24 24"
  }, props), _path$4 || (_path$4 = /* @__PURE__ */ g("path", {
    fill: "currentColor",
    d: "M21 6.75v10.5A3.754 3.754 0 0 1 17.25 21H6.75A3.754 3.754 0 0 1 3 17.25V6.75A3.754 3.754 0 0 1 6.75 3h10.5A3.754 3.754 0 0 1 21 6.75Zm-1.5 0c0-1.24-1.01-2.25-2.25-2.25H6.75C5.51 4.5 4.5 5.51 4.5 6.75v10.5c0 1.24 1.01 2.25 2.25 2.25h10.5c1.24 0 2.25-1.01 2.25-2.25V6.75Z"
  })), _path2$3 || (_path2$3 = /* @__PURE__ */ g("path", {
    fill: "#14C786",
    d: "M15 12.75a.75.75 0 1 0 0-1.5h-2.25V9a.75.75 0 1 0-1.5 0v2.25H9a.75.75 0 1 0 0 1.5h2.25V15a.75.75 0 1 0 1.5 0v-2.25H15Z"
  })));
}, _path$3, _path2$2;
function _extends$3() {
  return _extends$3 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i3 = 1; i3 < arguments.length; i3++) {
      var source = arguments[i3];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends$3.apply(this, arguments);
}
var SvgDone = function(props) {
  return /* @__PURE__ */ g("svg", _extends$3({
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    fill: "none",
    viewBox: "0 0 24 24"
  }, props), _path$3 || (_path$3 = /* @__PURE__ */ g("path", {
    fill: "currentColor",
    d: "M12 3a9 9 0 1 0 9 9 9.01 9.01 0 0 0-9-9Zm0 16.5a7.5 7.5 0 1 1 7.5-7.5 7.509 7.509 0 0 1-7.5 7.5Z"
  })), _path2$2 || (_path2$2 = /* @__PURE__ */ g("path", {
    fill: "#14C786",
    d: "m10.85 13.96-1.986-2.036a.5.5 0 0 0-.716 0 .527.527 0 0 0 0 .735l1.985 2.036a1.01 1.01 0 0 0 .717.305.99.99 0 0 0 .716-.305l4.686-4.808a.526.526 0 0 0 0-.735.5.5 0 0 0-.716 0l-4.687 4.809Z"
  })));
}, _path$2, _path2$1;
function _extends$2() {
  return _extends$2 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i3 = 1; i3 < arguments.length; i3++) {
      var source = arguments[i3];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends$2.apply(this, arguments);
}
var SvgCancel = function(props) {
  return /* @__PURE__ */ g("svg", _extends$2({
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    fill: "none",
    viewBox: "0 0 24 24"
  }, props), _path$2 || (_path$2 = /* @__PURE__ */ g("path", {
    fill: "#DA0000",
    d: "M15 9a.75.75 0 0 0-1.06 0L12 10.94 10.06 9A.75.75 0 0 0 9 10.06L10.94 12 9 13.94A.75.75 0 0 0 10.06 15L12 13.06 13.94 15A.75.75 0 0 0 15 13.94L13.06 12 15 10.06A.75.75 0 0 0 15 9Z"
  })), _path2$1 || (_path2$1 = /* @__PURE__ */ g("path", {
    fill: "currentColor",
    d: "M12 3a9 9 0 1 0 9 9 9.01 9.01 0 0 0-9-9Zm0 16.5a7.5 7.5 0 1 1 7.5-7.5 7.509 7.509 0 0 1-7.5 7.5Z"
  })));
};
function LargeArrayNode({ originNode, node, depth, index, deleteHandle: _deleteSelf, customOptions, startIndex, parent, parentPath }) {
  let { enableClipboard, src, onEdit, onChange, forceUpdate, displaySize, CustomOperation } = w2(JsonViewContext), currentPath = [...parentPath, String(index)], [fold, setFold] = d2(!0), editHandle = j2((indexOrName, newValue, oldValue) => {
    originNode[indexOrName] = newValue, onEdit && onEdit({
      newValue,
      oldValue,
      depth,
      src,
      indexOrName,
      parentType: "array",
      parentPath
    }), onChange && onChange({ type: "edit", depth, src, indexOrName, parentType: "array", parentPath }), forceUpdate();
  }, [node, onEdit, onChange, forceUpdate]), deleteHandle = (index2) => {
    originNode.splice(index2, 1), _deleteSelf && _deleteSelf(index2, parentPath), forceUpdate();
  }, Icons = u3(M, { children: [!fold && u3("span", Object.assign({ onClick: () => setFold(!0), className: "jv-size-chevron" }, { children: [ifDisplay(displaySize, depth, fold) && u3("span", Object.assign({ className: "jv-size" }, { children: [objectSize(node), " Items"] })), u3(SvgAngleDown, { className: "jv-chevron" })] })), !fold && enableClipboard && customCopy(customOptions) && u3(CopyButton, { node, nodeMeta: { depth, indexOrName: index, parent, parentPath, currentPath } }), typeof CustomOperation == "function" ? u3(CustomOperation, { node }) : null] });
  return u3("div", { children: [u3("span", { children: "[" }), Icons, fold ? u3("button", Object.assign({ onClick: () => setFold(!1), className: "jv-button" }, { children: [startIndex, " ... ", startIndex + node.length - 1] })) : u3("div", Object.assign({ className: "jv-indent" }, { children: node.map((n2, i3) => u3(NameValue, { indexOrName: i3 + startIndex, value: n2, depth, parent: node, deleteHandle, editHandle, parentPath }, String(index) + String(i3))) })), u3("span", { children: "]" })] });
}
function LargeArray({ node, depth, deleteHandle: _deleteSelf, indexOrName, customOptions, parent, parentPath }) {
  let currentPath = typeof indexOrName < "u" ? [...parentPath, String(indexOrName)] : parentPath, nestCollapsedArray = [];
  for (let i3 = 0; i3 < node.length; i3 += 100)
    nestCollapsedArray.push(node.slice(i3, i3 + 100));
  let { collapsed, enableClipboard, collapseObjectsAfterLength, editable, onDelete, src, onAdd, CustomOperation, onChange, forceUpdate, displaySize } = w2(JsonViewContext), [fold, setFold] = d2(isCollapsed_largeArray(node, depth, indexOrName, collapsed, collapseObjectsAfterLength, customOptions));
  A2(() => {
    setFold(isCollapsed_largeArray(node, depth, indexOrName, collapsed, collapseObjectsAfterLength, customOptions));
  }, [collapsed, collapseObjectsAfterLength]);
  let [deleting, setDeleting] = d2(!1), deleteSelf = () => {
    setDeleting(!1), _deleteSelf && _deleteSelf(indexOrName, parentPath), onDelete && onDelete({ value: node, depth, src, indexOrName, parentType: "array", parentPath }), onChange && onChange({
      type: "delete",
      depth,
      src,
      indexOrName,
      parentType: "array",
      parentPath
    });
  }, [adding, setAdding] = d2(!1), add = () => {
    let arr = node;
    arr.push(null), onAdd && onAdd({ indexOrName: arr.length - 1, depth, src, parentType: "array", parentPath }), onChange && onChange({ type: "add", indexOrName: arr.length - 1, depth, src, parentType: "array", parentPath }), forceUpdate();
  }, isEditing = deleting || adding, cancel = () => {
    setDeleting(!1), setAdding(!1);
  }, Icons = u3(M, { children: [!fold && !isEditing && u3("span", Object.assign({ onClick: () => setFold(!0), className: "jv-size-chevron" }, { children: [ifDisplay(displaySize, depth, fold) && u3("span", Object.assign({ className: "jv-size" }, { children: [node.length, " Items"] })), u3(SvgAngleDown, { className: "jv-chevron" })] })), isEditing && u3(SvgDone, { className: "json-view--edit", style: { display: "inline-block" }, onClick: adding ? add : deleteSelf }), isEditing && u3(SvgCancel, { className: "json-view--edit", style: { display: "inline-block" }, onClick: cancel }), !fold && !isEditing && enableClipboard && customCopy(customOptions) && u3(CopyButton, { node, nodeMeta: { depth, indexOrName, parent, parentPath, currentPath } }), !fold && !isEditing && editableAdd(editable) && customAdd(customOptions) && u3(SvgAddSquare, { className: "json-view--edit", onClick: () => {
    add();
  } }), !fold && !isEditing && editableDelete(editable) && customDelete(customOptions) && _deleteSelf && u3(SvgTrash, { className: "json-view--edit", onClick: () => setDeleting(!0) }), typeof CustomOperation == "function" ? u3(CustomOperation, { node }) : null] });
  return u3(M, { children: [u3("span", { children: "[" }), Icons, fold ? u3("button", Object.assign({ onClick: () => setFold(!1), className: "jv-button" }, { children: "..." })) : u3("div", Object.assign({ className: "jv-indent" }, { children: nestCollapsedArray.map((item, index) => u3(LargeArrayNode, { originNode: node, node: item, depth, index, startIndex: index * 100, deleteHandle: _deleteSelf, customOptions, parentPath }, String(indexOrName) + String(index))) })), u3("span", { children: "]" }), fold && ifDisplay(displaySize, depth, fold) && u3("span", Object.assign({ onClick: () => setFold(!1), className: "jv-size" }, { children: [node.length, " Items"] }))] });
}
function ObjectNode({ node, depth, indexOrName, deleteHandle: _deleteSelf, customOptions, parent, parentPath }) {
  let { collapsed, onCollapse, enableClipboard, ignoreLargeArray, collapseObjectsAfterLength, editable, onDelete, src, onAdd, onEdit, onChange, forceUpdate, displaySize, CustomOperation } = w2(JsonViewContext), currentPath = typeof indexOrName < "u" ? [...parentPath, String(indexOrName)] : parentPath;
  if (!ignoreLargeArray && Array.isArray(node) && node.length > 100)
    return u3(LargeArray, { node, depth, indexOrName, deleteHandle: _deleteSelf, customOptions, parentPath: currentPath });
  let isPlainObject = isObject(node), [fold, _setFold] = d2(isCollapsed(node, depth, indexOrName, collapsed, collapseObjectsAfterLength, customOptions)), setFold = (value) => {
    onCollapse?.({ isCollapsing: !value, node, depth, indexOrName }), _setFold(value);
  };
  A2(() => {
    setFold(isCollapsed(node, depth, indexOrName, collapsed, collapseObjectsAfterLength, customOptions));
  }, [collapsed, collapseObjectsAfterLength]);
  let editHandle = j2((indexOrName2, newValue, oldValue) => {
    Array.isArray(node) ? node[+indexOrName2] = newValue : node && (node[indexOrName2] = newValue), onEdit && onEdit({
      newValue,
      oldValue,
      depth,
      src,
      indexOrName: indexOrName2,
      parentType: isPlainObject ? "object" : "array",
      parentPath: currentPath
    }), onChange && onChange({ type: "edit", depth, src, indexOrName: indexOrName2, parentType: isPlainObject ? "object" : "array", parentPath: currentPath }), forceUpdate();
  }, [node, onEdit, onChange, forceUpdate]), deleteHandle = (indexOrName2) => {
    Array.isArray(node) ? node.splice(+indexOrName2, 1) : node && delete node[indexOrName2], forceUpdate();
  }, [deleting, setDeleting] = d2(!1), deleteSelf = () => {
    setDeleting(!1), _deleteSelf && _deleteSelf(indexOrName, currentPath), onDelete && onDelete({ value: node, depth, src, indexOrName, parentType: isPlainObject ? "object" : "array", parentPath: currentPath }), onChange && onChange({
      type: "delete",
      depth,
      src,
      indexOrName,
      parentType: isPlainObject ? "object" : "array",
      parentPath: currentPath
    });
  }, [adding, setAdding] = d2(!1), inputRef = T2(null), add = () => {
    var _a;
    if (isPlainObject) {
      let inputName = (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.value;
      inputName && (node[inputName] = null, inputRef.current && (inputRef.current.value = ""), setAdding(!1), onAdd && onAdd({ indexOrName: inputName, depth, src, parentType: "object", parentPath: currentPath }), onChange && onChange({ type: "add", indexOrName: inputName, depth, src, parentType: "object", parentPath: currentPath }));
    } else if (Array.isArray(node)) {
      let arr = node;
      arr.push(null), onAdd && onAdd({ indexOrName: arr.length - 1, depth, src, parentType: "array", parentPath: currentPath }), onChange && onChange({ type: "add", indexOrName: arr.length - 1, depth, src, parentType: "array", parentPath: currentPath });
    }
    forceUpdate();
  }, handleAddKeyDown = (event) => {
    event.key === "Enter" ? (event.preventDefault(), add()) : event.key === "Escape" && cancel();
  }, isEditing = deleting || adding, cancel = () => {
    setDeleting(!1), setAdding(!1);
  }, Icons = u3(M, { children: [!fold && !isEditing && u3("span", Object.assign({ onClick: () => setFold(!0), className: "jv-size-chevron" }, { children: [ifDisplay(displaySize, depth, fold) && u3("span", Object.assign({ className: "jv-size" }, { children: [objectSize(node), " Items"] })), u3(SvgAngleDown, { className: "jv-chevron" })] })), adding && isPlainObject && u3("input", { className: "json-view--input", placeholder: "property", ref: inputRef, onKeyDown: handleAddKeyDown }), isEditing && u3(SvgDone, { className: "json-view--edit", style: { display: "inline-block" }, onClick: adding ? add : deleteSelf }), isEditing && u3(SvgCancel, { className: "json-view--edit", style: { display: "inline-block" }, onClick: cancel }), !fold && !isEditing && enableClipboard && customCopy(customOptions) && u3(CopyButton, { node, nodeMeta: { depth, indexOrName, parent, parentPath, currentPath } }), !fold && !isEditing && editableAdd(editable) && customAdd(customOptions) && u3(SvgAddSquare, { className: "json-view--edit", onClick: () => {
    isPlainObject ? (setAdding(!0), setTimeout(() => {
      var _a;
      return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
    })) : add();
  } }), !fold && !isEditing && editableDelete(editable) && customDelete(customOptions) && _deleteSelf && u3(SvgTrash, { className: "json-view--edit", onClick: () => setDeleting(!0) }), typeof CustomOperation == "function" ? u3(CustomOperation, { node }) : null] });
  return Array.isArray(node) ? u3(M, { children: [u3("span", { children: "[" }), Icons, fold ? u3("button", Object.assign({ onClick: () => setFold(!1), className: "jv-button" }, { children: "..." })) : u3("div", Object.assign({ className: "jv-indent" }, { children: node.map((n2, i3) => u3(NameValue, { indexOrName: i3, value: n2, depth, parent: node, deleteHandle, editHandle, parentPath: currentPath }, String(indexOrName) + String(i3))) })), u3("span", { children: "]" }), fold && ifDisplay(displaySize, depth, fold) && u3("span", Object.assign({ onClick: () => setFold(!1), className: "jv-size" }, { children: [objectSize(node), " Items"] }))] }) : isPlainObject ? u3(M, { children: [u3("span", { children: "{" }), Icons, fold ? u3("button", Object.assign({ onClick: () => setFold(!1), className: "jv-button" }, { children: "..." })) : u3("div", Object.assign({ className: "jv-indent" }, { children: Object.entries(node).map(([name, value]) => u3(NameValue, { indexOrName: name, value, depth, parent: node, deleteHandle, editHandle, parentPath: currentPath }, String(indexOrName) + String(name))) })), u3("span", { children: "}" }), fold && ifDisplay(displaySize, depth, fold) && u3("span", Object.assign({ onClick: () => setFold(!1), className: "jv-size" }, { children: [objectSize(node), " Items"] }))] }) : u3("span", { children: String(node) });
}
var LongString = _n.forwardRef(({ str, className, ctrlClick }, ref) => {
  let { collapseStringMode, collapseStringsAfterLength, customizeCollapseStringUI } = w2(JsonViewContext), [truncated, setTruncated] = d2(!0), strRef = T2(null);
  collapseStringsAfterLength = collapseStringsAfterLength > 0 ? collapseStringsAfterLength : 0;
  let str_show = str.replace(/\s+/g, " "), collapseStringUI = typeof customizeCollapseStringUI == "function" ? customizeCollapseStringUI(str_show, truncated) : typeof customizeCollapseStringUI == "string" ? customizeCollapseStringUI : "...", clickToTruncateOrEdit = (event) => {
    var _a;
    if ((event.ctrlKey || event.metaKey) && ctrlClick)
      ctrlClick(event);
    else {
      let selection = window.getSelection();
      if (selection && selection.anchorOffset !== selection.focusOffset && ((_a = selection.anchorNode) === null || _a === void 0 ? void 0 : _a.parentElement) === strRef.current)
        return;
      setTruncated(!truncated);
    }
  };
  if (str.length <= collapseStringsAfterLength)
    return u3("span", Object.assign({ ref: strRef, className, onClick: ctrlClick }, { children: ['"', str, '"'] }));
  if (collapseStringMode === "address")
    return str.length <= 10 ? u3("span", Object.assign({ ref: strRef, className, onClick: ctrlClick }, { children: ['"', str, '"'] })) : u3("span", Object.assign({ ref: strRef, onClick: clickToTruncateOrEdit, className: className + " cursor-pointer" }, { children: ['"', truncated ? [str_show.slice(0, 6), collapseStringUI, str_show.slice(-4)] : str, '"'] }));
  if (collapseStringMode === "directly")
    return u3("span", Object.assign({ ref: strRef, onClick: clickToTruncateOrEdit, className: className + " cursor-pointer" }, { children: ['"', truncated ? [str_show.slice(0, collapseStringsAfterLength), collapseStringUI] : str, '"'] }));
  if (collapseStringMode === "word") {
    let index_ahead = collapseStringsAfterLength, index_behind = collapseStringsAfterLength + 1, str_collapsed = str_show, count = 1;
    for (; ; ) {
      if (/\W/.test(str[index_ahead])) {
        str_collapsed = str.slice(0, index_ahead);
        break;
      }
      if (/\W/.test(str[index_behind])) {
        str_collapsed = str.slice(0, index_behind);
        break;
      }
      if (count === 6) {
        str_collapsed = str.slice(0, collapseStringsAfterLength);
        break;
      }
      count++, index_ahead--, index_behind++;
    }
    return u3("span", Object.assign({ ref: strRef, onClick: clickToTruncateOrEdit, className: className + " cursor-pointer" }, { children: ['"', truncated ? [str_collapsed, collapseStringUI] : str, '"'] }));
  }
  return u3("span", Object.assign({ ref: strRef, className }, { children: ['"', str, '"'] }));
}), _path$1;
function _extends$1() {
  return _extends$1 = Object.assign ? Object.assign.bind() : function(target) {
    for (var i3 = 1; i3 < arguments.length; i3++) {
      var source = arguments[i3];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends$1.apply(this, arguments);
}
var SvgEdit = function(props) {
  return /* @__PURE__ */ g("svg", _extends$1({
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    fill: "none",
    viewBox: "0 0 24 24"
  }, props), _path$1 || (_path$1 = /* @__PURE__ */ g("path", {
    fill: "currentColor",
    d: "M17.25 3H6.75A3.754 3.754 0 0 0 3 6.75v10.5A3.754 3.754 0 0 0 6.75 21h10.5A3.754 3.754 0 0 0 21 17.25V6.75A3.754 3.754 0 0 0 17.25 3Zm2.25 14.25c0 1.24-1.01 2.25-2.25 2.25H6.75c-1.24 0-2.25-1.01-2.25-2.25V6.75c0-1.24 1.01-2.25 2.25-2.25h10.5c1.24 0 2.25 1.01 2.25 2.25v10.5Zm-6.09-9.466-5.031 5.03a2.981 2.981 0 0 0-.879 2.121v1.19c0 .415.336.75.75.75h1.19c.8 0 1.554-.312 2.12-.879l5.03-5.03a2.252 2.252 0 0 0 0-3.182c-.85-.85-2.331-.85-3.18 0Zm-2.91 7.151c-.28.28-.666.44-1.06.44H9v-.44c0-.4.156-.777.44-1.06l3.187-3.188 1.06 1.061-3.187 3.188Zm5.03-5.03-.782.783-1.06-1.061.782-.782a.766.766 0 0 1 1.06 0 .75.75 0 0 1 0 1.06Z"
  })));
}, _path, _path2;
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function(target) {
    for (var i3 = 1; i3 < arguments.length; i3++) {
      var source = arguments[i3];
      for (var key in source)
        Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
    }
    return target;
  }, _extends.apply(this, arguments);
}
var SvgLink = function(props) {
  return /* @__PURE__ */ g("svg", _extends({
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    fill: "none",
    viewBox: "0 0 24 24"
  }, props), _path || (_path = /* @__PURE__ */ g("path", {
    fill: "currentColor",
    d: "M6.75 3h5.5v1.5h-5.5C5.51 4.5 4.5 5.51 4.5 6.75v10.5c0 1.24 1.01 2.25 2.25 2.25h10.5c1.24 0 2.25-1.01 2.25-2.25v-5.5H21v5.5A3.754 3.754 0 0 1 17.25 21H6.75A3.754 3.754 0 0 1 3 17.25V6.75A3.754 3.754 0 0 1 6.75 3Z"
  })), _path2 || (_path2 = /* @__PURE__ */ g("path", {
    fill: "currentColor",
    d: "M20.013 3h-3.946a.987.987 0 0 0 0 1.973h1.564l-6.342 6.342a1.004 1.004 0 0 0 0 1.396 1.004 1.004 0 0 0 1.396 0l6.342-6.342v1.564a.987.987 0 0 0 1.973 0V3.987A.987.987 0 0 0 20.013 3Z"
  })));
};
function JsonNode({ node, depth, deleteHandle: _deleteHandle, indexOrName, parent, editHandle, parentPath }) {
  let { collapseStringsAfterLength, enableClipboard, editable, src, onDelete, onChange, customizeNode, matchesURL, urlRegExp, EditComponent, DoneComponent, CancelComponent, CustomOperation } = w2(JsonViewContext), customReturn;
  if (typeof customizeNode == "function" && (customReturn = safeCall(customizeNode, [{ node, depth, indexOrName }])), customReturn) {
    if (ln(customReturn))
      return customReturn;
    if (isReactComponent(customReturn))
      return u3(customReturn, { node, depth, indexOrName });
  }
  if (Array.isArray(node) || isObject(node))
    return u3(ObjectNode, { parent, node, depth, indexOrName, deleteHandle: _deleteHandle, parentPath, customOptions: typeof customReturn == "object" ? customReturn : void 0 });
  {
    let type = typeof node, currentPath = typeof indexOrName < "u" ? [...parentPath, String(indexOrName)] : parentPath, [editing, setEditing] = d2(!1), [deleting, setDeleting] = d2(!1), valueRef = T2(null), edit = () => {
      setEditing(!0), setTimeout(() => {
        var _a, _b;
        (_a = window.getSelection()) === null || _a === void 0 || _a.selectAllChildren(valueRef.current), (_b = valueRef.current) === null || _b === void 0 || _b.focus();
      });
    }, done = j2(() => {
      let newValue = valueRef.current.innerText;
      try {
        let parsedValue = JSON.parse(newValue);
        editHandle && editHandle(indexOrName, parsedValue, node, parentPath);
      } catch {
        let trimmedStringValue = resolveEvalFailedNewValue(type, newValue);
        editHandle && editHandle(indexOrName, trimmedStringValue, node, parentPath);
      }
      setEditing(!1);
    }, [editHandle, indexOrName, node, parentPath, type]), cancel = () => {
      setEditing(!1), setDeleting(!1);
    }, deleteHandle = () => {
      setDeleting(!1), _deleteHandle && _deleteHandle(indexOrName, parentPath), onDelete && onDelete({
        value: node,
        depth,
        src,
        indexOrName,
        parentType: Array.isArray(parent) ? "array" : "object",
        parentPath
      }), onChange && onChange({
        depth,
        src,
        indexOrName,
        parentType: Array.isArray(parent) ? "array" : "object",
        type: "delete",
        parentPath
      });
    }, handleKeyDown = j2((event) => {
      event.key === "Enter" ? (event.preventDefault(), done()) : event.key === "Escape" && cancel();
    }, [done]), isEditing = editing || deleting, ctrlClick = !isEditing && editableEdit(editable) && customEdit(customReturn) && editHandle ? (event) => {
      (event.ctrlKey || event.metaKey) && edit();
    } : void 0, Icons = u3(M, { children: [isEditing && (typeof DoneComponent == "function" ? u3(DoneComponent, { className: "json-view--edit", style: { display: "inline-block" }, onClick: deleting ? deleteHandle : done }) : u3(SvgDone, { className: "json-view--edit", style: { display: "inline-block" }, onClick: deleting ? deleteHandle : done })), isEditing && (typeof CancelComponent == "function" ? u3(CancelComponent, { className: "json-view--edit", style: { display: "inline-block" }, onClick: cancel }) : u3(SvgCancel, { className: "json-view--edit", style: { display: "inline-block" }, onClick: cancel })), !isEditing && enableClipboard && customCopy(customReturn) && u3(CopyButton, { node, nodeMeta: { depth, indexOrName, parent, parentPath, currentPath } }), !isEditing && matchesURL && type === "string" && urlRegExp.test(node) && customMatchesURL(customReturn) && u3("a", Object.assign({ href: node, target: "_blank", className: "json-view--link" }, { children: u3(SvgLink, {}) })), !isEditing && editableEdit(editable) && customEdit(customReturn) && editHandle && (typeof EditComponent == "function" ? u3(EditComponent, { className: "json-view--edit", onClick: edit }) : u3(SvgEdit, { className: "json-view--edit", onClick: edit })), !isEditing && editableDelete(editable) && customDelete(customReturn) && _deleteHandle && u3(SvgTrash, { className: "json-view--edit", onClick: () => setDeleting(!0) }), typeof CustomOperation == "function" ? u3(CustomOperation, { node }) : null] }), className = "json-view--string";
    switch (type) {
      case "number":
      case "bigint":
        className = "json-view--number";
        break;
      case "boolean":
        className = "json-view--boolean";
        break;
      case "object":
        className = "json-view--null";
        break;
    }
    typeof customReturn?.className == "string" && (className += " " + customReturn.className), deleting && (className += " json-view--deleting");
    let displayValue = String(node);
    type === "bigint" && (displayValue += "n");
    let EditingElement = b2(() => u3("span", { contentEditable: !0, className, dangerouslySetInnerHTML: { __html: type === "string" ? `"${displayValue}"` : displayValue }, ref: valueRef, onKeyDown: handleKeyDown }), [displayValue, type, handleKeyDown]);
    return type === "string" ? u3(M, { children: [editing ? EditingElement : node.length > collapseStringsAfterLength ? u3(LongString, { str: node, ref: valueRef, className, ctrlClick }) : u3("span", Object.assign({ className, onClick: ctrlClick }, { children: ['"', displayValue, '"'] })), Icons] }) : u3(M, { children: [editing ? EditingElement : u3("span", Object.assign({ className, onClick: ctrlClick }, { children: displayValue })), Icons] });
  }
}
var defaultURLRegExp = /^(((ht|f)tps?):\/\/)?([^!@#$%^&*?.\s-]([^!@#$%^&*?.\s]{0,63}[^!@#$%^&*?.\s])?\.)+[a-z]{2,6}\/?/, JsonViewContext = K({
  src: void 0,
  collapseStringsAfterLength: 99,
  collapseStringMode: "directly",
  customizeCollapseStringUI: void 0,
  collapseObjectsAfterLength: 20,
  collapsed: !1,
  onCollapse: void 0,
  enableClipboard: !0,
  editable: !1,
  onEdit: void 0,
  onDelete: void 0,
  onAdd: void 0,
  onChange: void 0,
  forceUpdate: () => {
  },
  customizeNode: void 0,
  customizeCopy: (() => {
  }),
  displaySize: void 0,
  displayArrayIndex: !0,
  matchesURL: !1,
  urlRegExp: defaultURLRegExp,
  ignoreLargeArray: !1,
  CopyComponent: void 0,
  CopiedComponent: void 0,
  EditComponent: void 0,
  CancelComponent: void 0,
  DoneComponent: void 0,
  CustomOperation: void 0
});
function JsonView({ src: _src, collapseStringsAfterLength = 99, collapseStringMode = "directly", customizeCollapseStringUI, collapseObjectsAfterLength = 99, collapsed, onCollapse, enableClipboard = !0, editable = !1, onEdit, onDelete, onAdd, onChange, dark = !1, theme = "default", customizeNode, customizeCopy = (node) => stringifyForCopying(node), displaySize, displayArrayIndex = !0, style, className, matchesURL = !1, urlRegExp = defaultURLRegExp, ignoreLargeArray = !1, CopyComponent, CopiedComponent, EditComponent, CancelComponent, DoneComponent, CustomOperation }) {
  let [_3, update] = d2(0), forceUpdate = j2(() => update((state) => ++state), []), [src, setSrc] = d2(_src);
  return A2(() => setSrc(_src), [_src]), u3(JsonViewContext.Provider, Object.assign({ value: {
    src,
    collapseStringsAfterLength,
    collapseStringMode,
    customizeCollapseStringUI,
    collapseObjectsAfterLength,
    collapsed,
    onCollapse,
    enableClipboard,
    editable,
    onEdit,
    onDelete,
    onAdd,
    onChange,
    forceUpdate,
    customizeNode,
    customizeCopy,
    displaySize,
    displayArrayIndex,
    matchesURL,
    urlRegExp,
    ignoreLargeArray,
    CopyComponent,
    CopiedComponent,
    EditComponent,
    CancelComponent,
    DoneComponent,
    CustomOperation
  } }, { children: u3("code", Object.assign({ className: "json-view" + (dark ? " dark" : "") + (theme && theme !== "default" ? " json-view_" + theme : "") + (className ? " " + className : ""), style }, { children: u3(JsonNode, { node: src, depth: 1, editHandle: (indexOrName, newValue, oldValue, parentPath) => {
    setSrc(newValue), onEdit && onEdit({
      newValue,
      oldValue,
      depth: 1,
      src,
      indexOrName,
      parentType: null,
      parentPath
    }), onChange && onChange({ type: "edit", depth: 1, src, indexOrName, parentType: null, parentPath });
  }, deleteHandle: (indexOrName, parentPath) => {
    setSrc(void 0), onDelete && onDelete({
      value: src,
      depth: 1,
      src,
      indexOrName,
      parentType: null,
      parentPath
    }), onChange && onChange({
      depth: 1,
      src,
      indexOrName,
      parentType: null,
      type: "delete",
      parentPath
    });
  }, parentPath: [] }) })) }));
}

// packages/JSONViewer/src/theme.ts
var isMoeskin = () => mw.config.get("skin") === "moeskin", darkModeAttribute = () => isMoeskin() ? "color-mode" : "class", isDarkTheme = () => {
  if (isMoeskin())
    return document.documentElement.getAttribute("color-mode") === "dark";
  let { classList } = document.documentElement;
  return classList.contains("skin-theme-clientpref-night") ? !0 : classList.contains("skin-theme-clientpref-os") && window.matchMedia("(prefers-color-scheme: dark)").matches;
}, subscribeSkinDark = (onStoreChange) => {
  let observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: !0,
    attributeFilter: [darkModeAttribute()]
  });
  let prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  return prefersDark.addEventListener("change", onStoreChange), () => {
    observer.disconnect(), prefersDark.removeEventListener("change", onStoreChange);
  };
};

// packages/JSONViewer/src/JSONViewer.tsx
var JSONViewer = ({ json }) => {
  let config = Z(subscribeConfig, getConfig), skinDark = Z(subscribeSkinDark, isDarkTheme), dark = config.dark === !0 || skinDark;
  return /* @__PURE__ */ _n.createElement(
    JsonView,
    {
      src: json,
      displaySize: !0,
      collapseStringMode: "word",
      collapseStringsAfterLength: 150,
      theme: config.theme,
      dark
    }
  );
}, JSONViewer_default = JSONViewer;

// packages/JSONViewer/src/source.ts
var parseDiffParam = (search) => {
  let urlParams = new URLSearchParams(search), diff = urlParams.get("diff") ?? urlParams.get("oldid");
  if (diff === null)
    return;
  let revision = +diff;
  return Number.isInteger(revision) && revision > 0 ? revision : void 0;
}, pageSource = async (title, params) => {
  let res = await new mw.Api().post({
    action: "query",
    prop: "revisions",
    formatversion: "2",
    titles: title,
    rvprop: "content",
    rvslots: "main",
    ...params
  }), [pageData] = res.query.pages ?? [];
  if (pageData)
    return pageData.revisions?.[0]?.slots?.main?.content;
};

// packages/JSONViewer/src/index.tsx
initConfigStore();
var mountViewer = (json) => {
  let container = document.createElement("div");
  return container.id = "bearbintools-jsonviewer", createRoot(container).render(
    /* @__PURE__ */ _n.createElement(M, null, /* @__PURE__ */ _n.createElement(JSONViewer_default, { json }))
  ), container;
};
$(() => (async () => {
  if (mw.config.get("wgAction") !== "view")
    return;
  let contentModel = mw.config.get("wgPageContentModel"), jsonElement = document.getElementsByClassName("mw-json")[0], contentText = document.getElementById("mw-content-text");
  try {
    if (contentModel === "json" && jsonElement) {
      let diff = parseDiffParam(window.location.search), source = await pageSource(
        mw.config.get("wgPageName"),
        diff ? {
          rvstartid: diff,
          rvendid: diff
        } : void 0
      );
      if (source === void 0)
        return;
      jsonElement.replaceWith(mountViewer(JSON.parse(source)));
    } else contentModel === "text" && contentText && mw.config.get("wgTitle").includes("json") && contentText.replaceChildren(mountViewer(JSON.parse(contentText.textContent)));
  } catch (error) {
    console.error("JSONViewer: \u9875\u9762\u5185\u5BB9\u4E0D\u662F\u6709\u6548\u7684 JSON", error);
  }
})());
