
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var ElGrapho_min = createCommonjsModule(function (module, exports) {
    /*
     * El Grapho v2.4.0
     * A high performance WebGL graph data visualization engine
     * Release Date: 05-10-2019
     * https://github.com/ericdrowell/elgrapho
     * Licensed under the MIT or GPL Version 2 licenses.
     *
     * Copyright (C) 2019 Eric Rowell @ericdrowell
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in
     * all copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
     * THE SOFTWARE.
     */
    !function(t,n){module.exports=n();}(commonjsGlobal,function(){return function(t){var n={};function e(r){if(n[r])return n[r].exports;var o=n[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,e),o.l=!0,o.exports}return e.m=t,e.c=n,e.d=function(t,n,r){e.o(t,n)||Object.defineProperty(t,n,{enumerable:!0,get:r});},e.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},e.t=function(t,n){if(1&n&&(t=e(t)),8&n)return t;if(4&n&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(e.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&n&&"string"!=typeof t)for(var o in t)e.d(r,o,function(n){return t[n]}.bind(null,o));return r},e.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(n,"a",n),n},e.o=function(t,n){return Object.prototype.hasOwnProperty.call(t,n)},e.p="",e(e.s="./engine/src/ElGrapho.js")}({"./engine/dist/icons/boxZoomIcon.svg.js":function(t,n){t.exports='\n<?xml version="1.0" encoding="iso-8859-1"?>\n\x3c!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  --\x3e\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\n   width="20" hei ght="20" viewBox="0 0 611.997 611.998" \n   xml:space="preserve">\n<g>\n  <g>\n    <path d="M601.444,535.785L433.663,368.39c1.512-2.27,2.646-6.033,3.772-10.939c17.719-29.785,28.682-62.207,32.052-96.519\n      c0.772-7.915,1.126-16.208,1.126-24.13c0-26.012-4.343-52.088-13.19-77.665c-11.51-33.243-29.905-62.842-55.426-88.218\n      c-45.364-45.13-105.189-68.625-166.64-68.625c-60.702,0-120.801,23.607-166.269,68.625\n      c-30.315,30.009-50.391,65.633-61.08,105.938c-10.802,40.755-10.553,80.681,0,121.026c10.561,40.346,30.652,75.67,61.08,105.945\n      c45.355,45.131,105.567,68.617,166.269,68.617c47.125,0,89.964-13.625,129.688-38.455l6.033-3.771l168.529,168.15\n      c6.418,6.402,13.199,10.176,19.609,10.932c1.504,0.377,2.638,0.449,3.764,0.377c4.537-0.297,8.695-1.463,12.065-3.395\n      c4.552-2.598,9.427-6.41,14.703-11.686l7.544-7.537c5.276-5.285,9.089-10.158,11.688-14.703c1.922-3.369,3.016-7.922,3.016-13.576\n      v-3.018C611.997,549.345,608.048,542.373,601.444,535.785z M422.354,287.33c-8.848,33.131-25.634,62.207-50.52,87.092\n      c-36.194,36.188-84.832,56.553-136.478,56.553c-50.905,0-99.221-20.695-136.863-56.553c-73.957-70.466-73.651-202.198,0-273.34\n      c37.2-35.937,85.588-56.93,136.863-56.93c53.914,0,98.892,19.11,136.478,56.93c24.62,24.765,41.849,53.536,50.52,86.714\n      C431.024,220.973,431.226,254.103,422.354,287.33z"/>\n    <polygon points="258.353,138.401 212.732,138.401 212.732,214.563 136.571,214.563 136.571,260.184 212.732,260.184 \n      212.732,336.714 258.353,336.714 258.353,260.184 334.885,260.184 334.885,214.563 258.353,214.563     "/>\n  </g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n</svg>\n';},"./engine/dist/icons/moveIcon.svg.js":function(t,n){t.exports='\n<?xml version=\'1.0\' encoding=\'utf-8\'?>\n<!DOCTYPE svg PUBLIC \'-//W3C//DTD SVG 1.1//EN\' \'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\'>\n<svg width="20" version="1.1" xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 64 64" xmlns:xlink="http://www.w3.org/1999/xlink" enable-background="new 0 0 64 64">\n  <g>\n    <path fill="#1D1D1B" d="m63.875,31.203c-0.102-0.246-0.248-0.467-0.435-0.652l-6.837-6.838c-0.783-0.783-2.051-0.783-2.834,0-0.781,0.781-0.781,2.05 0,2.832l3.42,3.42-23.16-.001 .002-23.155 3.568,3.57c0.393,0.392 0.904,0.588 1.418,0.588 0.512,0 1.025-0.196 1.416-0.588 0.783-0.781 0.783-2.051 0-2.834l-6.988-6.99c-0.186-0.186-0.406-0.332-0.652-0.434-0.49-0.203-1.041-0.203-1.531,0-0.244,0.101-0.463,0.246-0.646,0.429 0,0-0.002,0.002-0.004,0.003l-6.844,6.84c-0.781,0.783-0.781,2.051 0,2.834 0.393,0.391 0.904,0.587 1.418,0.587 0.512,0 1.025-0.196 1.416-0.587l3.422-3.42-.002,23.157-23.15-.001 3.417-3.418c0.781-0.782 0.781-2.051 0-2.832-0.783-0.783-2.051-0.783-2.834,0l-6.838,6.84c-0.393,0.391-0.588,0.903-0.588,1.416s0.195,1.025 0.588,1.417l6.988,6.989c0.392,0.393 0.904,0.588 1.417,0.588s1.025-0.195 1.417-0.588c0.782-0.783 0.782-2.051 0-2.833l-3.571-3.571 23.153,.001-.001,23.153-3.418-3.417c-0.783-0.78-2.051-0.782-2.834,0.001-0.781,0.783-0.781,2.052 0,2.834l6.844,6.839c0.391,0.392 0.904,0.587 1.416,0.587 0.513,0 1.025-0.195 1.416-0.587l6.99-6.991c0.783-0.783 0.783-2.053 0-2.834-0.783-0.783-2.051-0.783-2.834,0l-3.572,3.574 .002-23.159 23.16,.001-3.57,3.569c-0.781,0.782-0.781,2.05 0,2.833 0.393,0.393 0.904,0.588 1.418,0.588 0.512,0 1.025-0.195 1.416-0.588l6.989-6.989c0.004-0.005 0.006-0.012 0.012-0.017 0.177-0.182 0.321-0.396 0.421-0.633 0.102-0.246 0.154-0.506 0.154-0.768-0.001-0.259-0.053-0.52-0.155-0.765z"/>\n  </g>\n</svg>\n';},"./engine/dist/icons/resetIcon.svg.js":function(t,n){t.exports='\n<?xml version="1.0" encoding="iso-8859-1"?>\n\x3c!-- Generator: Adobe Illustrator 19.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  --\x3e\n<svg version="1.1" width="20" height="20" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\n   viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">\n<g>\n  <g>\n    <path d="M288.502,32.502c-108.328,0-198.827,77.485-219.166,179.899l-42.482-53.107L0,180.784l68.769,85.961\n      c3.352,4.178,8.338,6.447,13.427,6.447c2.596,0,5.226-0.585,7.685-1.805l103.153-51.577l-15.387-30.757l-75.8,37.892\n      c14.063-90.5,92.27-160.059,186.655-160.059c104.271,0,189.114,84.843,189.114,189.114s-84.843,189.114-189.114,189.114v34.384\n      C411.735,479.498,512,379.233,512,256S411.735,32.502,288.502,32.502z"/>\n  </g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n</svg>\n';},"./engine/dist/icons/selectIcon.svg.js":function(t,n){t.exports='\n<?xml version="1.0" encoding="iso-8859-1"?>\n\x3c!-- Generator: Adobe Illustrator 17.1.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  --\x3e\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg widht="20" height="20" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\n   viewBox="0 0 260.366 260.366" style="enable-background:new 0 0 260.366 260.366;" xml:space="preserve">\n<path d="M255.972,189.463l-47.347-47.348l41.082-41.082c3.675-3.675,5.186-8.989,3.993-14.047c-1.191-5.059-4.917-9.14-9.846-10.786\n  L19.754,1.316c-5.393-1.804-11.341-0.401-15.36,3.62c-4.021,4.021-5.422,9.968-3.62,15.36l74.885,224.101\n  c1.646,4.929,5.728,8.654,10.786,9.846c5.053,1.193,10.371-0.317,14.047-3.993l42.165-42.165l47.348,47.347\n  c2.929,2.929,6.768,4.394,10.606,4.394s7.678-1.465,10.606-4.394l44.755-44.755C261.83,204.819,261.83,195.321,255.972,189.463z\n   M200.611,223.612l-47.348-47.347c-2.929-2.929-6.768-4.394-10.606-4.394s-7.678,1.465-10.606,4.394l-35.624,35.624L38.752,39.294\n  l172.595,57.674l-34.541,34.541c-5.858,5.857-5.858,15.355,0,21.213l47.347,47.348L200.611,223.612z"/>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n</svg>\n';},"./engine/dist/icons/zoomInIcon.svg.js":function(t,n){t.exports='\n<?xml version="1.0" encoding="iso-8859-1"?>\n\x3c!-- Generator: Adobe Illustrator 19.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  --\x3e\n<svg width="20" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\n   viewBox="0 0 42 42" style="enable-background:new 0 0 42 42;" xml:space="preserve">\n<polygon points="42,20 22,20 22,0 20,0 20,20 0,20 0,22 20,22 20,42 22,42 22,22 42,22 "/>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n</svg>\n';},"./engine/dist/icons/zoomOutIcon.svg.js":function(t,n){t.exports='\n<?xml version="1.0" encoding="iso-8859-1"?>\n\x3c!-- Generator: Adobe Illustrator 19.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  --\x3e\n<svg width="20" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\n   viewBox="0 0 42 42" style="enable-background:new 0 0 42 42;" xml:space="preserve">\n<rect y="20" width="42" height="2"/>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n<g>\n</g>\n</svg>\n';},"./engine/dist/shaders/hitPoint.vert.js":function(t,n){t.exports="//#version 300 es\n\nattribute vec4 aVertexPosition;\nattribute float aVertexIndex;\n\nuniform mat4 uModelViewMatrix;\nuniform mat4 uProjectionMatrix;\nuniform bool magicZoom;\nuniform float nodeSize;\nuniform float zoom;\n\nvarying vec4 vVertexColor;\n\nconst float MAX_NODE_SIZE = 16.0;\n\n// unsigned rIntValue = (u_color / 256 / 256) % 256;\n// unsigned gIntValue = (u_color / 256      ) % 256;\n// unsigned bIntValue = (u_color            ) % 256;\n\n// https://stackoverflow.com/questions/6893302/decode-rgb-value-to-single-float-without-bit-shift-in-glsl\n// had to flip r and b to match concrete notation\nvec3 unpackColor(float f) {\n  vec3 color;\n  color.r = floor(f / 256.0 / 256.0);\n  color.g = floor((f - color.r * 256.0 * 256.0) / 256.0);\n  color.b = floor(f - color.r * 256.0 * 256.0 - color.g * 256.0);\n  // now we have a vec3 with the 3 components in range [0..255]. Let's normalize it!\n  return color / 255.0;\n}\n\nvoid main() {\n  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;\n\n  if (magicZoom) {\n    gl_PointSize = MAX_NODE_SIZE; \n  }\n  else {\n    float size = nodeSize * MAX_NODE_SIZE * zoom;\n    gl_PointSize = max(size, 5.0);\n  }\n\n  vVertexColor = vec4(unpackColor(aVertexIndex), 1.0);\n}";},"./engine/dist/shaders/point.frag.js":function(t,n){t.exports="//#version 300 es\n\n//https://www.desultoryquest.com/blog/drawing-anti-aliased-circular-points-using-opengl-slash-webgl/\n//#extension GL_OES_standard_derivatives : enable\n\n// https://www.desultoryquest.com/blog/drawing-anti-aliased-circular-points-using-opengl-slash-webgl/\n// https://www.desultoryquest.com/blog/downloads/code/points.js\nprecision mediump float;\nvarying vec4 vVertexColor;\n\nvoid main(void) {\n  float r = 0.0, delta = 0.0, alpha = 1.0;\n  vec2 cxy = 2.0 * gl_PointCoord - 1.0;\n  r = dot(cxy, cxy);\n\n  if (r > 1.0) {\n    discard;\n  }\n\n  // delta = fwidth(r);\n  // alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);\n\n\n\n\n  gl_FragColor = vVertexColor * alpha;\n}";},"./engine/dist/shaders/point.vert.js":function(t,n){t.exports="//#version 300 es\n\nattribute vec4 aVertexPosition;\n// TODO: this should be an int\nattribute float aVertexColor;\n\nuniform mat4 uModelViewMatrix;\nuniform mat4 uProjectionMatrix;\nuniform bool magicZoom;\nuniform float nodeSize;\n// TODO: focusedGroup and group should change to int\nuniform float focusedGroup;\nuniform float zoom;\nuniform float globalAlpha; // 0..1\nuniform bool darkMode;\n\nvarying vec4 vVertexColor;\n\nconst float MAX_NODE_SIZE = 16.0;\n\n// const PALETTE_HEX = [\n//   '3366CC',\n//   'DC3912',\n//   'FF9900',\n//   '109618',\n//   '990099',\n//   '3B3EAC',\n//   '0099C6',\n//   'DD4477',\n//   '66AA00',\n//   'B82E2E',\n//   '316395',\n//   '994499',\n//   '22AA99',\n//   'AAAA11',\n//   '6633CC',\n//   'E67300',\n//   '8B0707',\n//   '329262',\n//   '5574A6',\n//   '3B3EAC'\n// ];\n\nvoid main() {\n  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;\n\n  if (magicZoom) {\n    gl_PointSize = MAX_NODE_SIZE; \n  }\n  else {\n    gl_PointSize = nodeSize * MAX_NODE_SIZE * zoom;\n  }\n\n  float validColor = mod(aVertexColor, 8.0);\n\n  // gl_VertexID\n\n  bool isFocused = focusedGroup == -1.0 || aVertexColor == focusedGroup;\n\n  if (isFocused) {\n    // must be between -1 and 1\n    gl_Position.z = -0.5;\n  }\n  else {\n    gl_Position.z = -0.2;\n  }\n\n  if (!isFocused) {\n    if (darkMode) {\n      vVertexColor = vec4(60.0/255.0, 60.0/255.0, 60.0/255.0, globalAlpha);  \n    }\n    else {\n      vVertexColor = vec4(220.0/255.0, 220.0/255.0, 220.0/255.0, globalAlpha);\n    }\n  }\n  else if (validColor == 0.0) {\n    vVertexColor = vec4(51.0/255.0, 102.0/255.0, 204.0/255.0, globalAlpha); // 3366CC\n  }\n  else if (validColor == 1.0) {\n    vVertexColor = vec4(220.0/255.0, 57.0/255.0, 18.0/255.0, globalAlpha); // DC3912\n  }\n  else if (validColor == 2.0) {\n    vVertexColor = vec4(255.0/255.0, 153.0/255.0, 0.0/255.0, globalAlpha); // FF9900\n  }\n  else if (validColor == 3.0) {\n    vVertexColor = vec4(16.0/255.0, 150.0/255.0, 24.0/255.0, globalAlpha); // 109618\n  }\n  else if (validColor == 4.0) {\n    vVertexColor = vec4(153.0/255.0, 0.0/255.0, 153.0/255.0, globalAlpha); // 990099\n  }\n  else if (validColor == 5.0) {\n    vVertexColor = vec4(59.0/255.0, 62.0/255.0, 172.0/255.0, globalAlpha); // 3B3EAC\n  }\n  else if (validColor == 6.0) {\n    vVertexColor = vec4(0.0/255.0, 153.0/255.0, 198.0/255.0, globalAlpha); // 0099C6\n  }\n  else if (validColor == 7.0) {\n    vVertexColor = vec4(221.0/255.0, 68.0/255.0, 119.0/255.0, globalAlpha); // DD4477\n  }\n\n}";},"./engine/dist/shaders/pointHit.frag.js":function(t,n){t.exports="//#version 300 es\n\n//https://www.desultoryquest.com/blog/drawing-anti-aliased-circular-points-using-opengl-slash-webgl/\nprecision mediump float;\nvarying vec4 vVertexColor;\n\nvoid main(void) {\n  float r = 0.0, delta = 0.0, alpha = 1.0;\n  vec2 cxy = 2.0 * gl_PointCoord - 1.0;\n  r = dot(cxy, cxy);\n  if (r > 1.0) {\n    discard;\n  }\n\n  gl_FragColor = vVertexColor * alpha;\n}";},"./engine/dist/shaders/pointStroke.vert.js":function(t,n){t.exports="//#version 300 es\n\nattribute vec4 aVertexPosition;\nattribute float aVertexColor;\n\nuniform mat4 uModelViewMatrix;\nuniform mat4 uProjectionMatrix;\nuniform bool magicZoom;\nuniform float nodeSize;\nuniform float focusedGroup;\nuniform int hoverNode;\nuniform float zoom;\nuniform bool darkMode;\n\nvarying vec4 vVertexColor;\n\nconst float POINT_STROKE_WIDTH_FACTOR = 1.5;\nconst float MAX_NODE_SIZE = 16.0;\n\nvoid main() {\n  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;\n  //gl_Position.z = 0.0;\n\n  if (magicZoom) {\n    gl_PointSize = MAX_NODE_SIZE * POINT_STROKE_WIDTH_FACTOR; \n  }\n  else {\n    gl_PointSize = nodeSize * MAX_NODE_SIZE * zoom * POINT_STROKE_WIDTH_FACTOR;\n  }\n\n  \n  if (focusedGroup == -1.0 || aVertexColor == focusedGroup) {\n    gl_Position.z = -0.4;\n  }\n  else {\n    gl_Position.z = -0.1;\n  }\n\n  // if (gl_VertexID == hoverNode) {\n    \n  //   vVertexColor = vec4(0.0, 0.0, 0.0, 1.0); \n  // }\n  // else {\n\n  if (darkMode) {\n    vVertexColor = vec4(0.0, 0.0, 0.0, 1.0); \n  }\n  else {\n    vVertexColor = vec4(1.0, 1.0, 1.0, 1.0); \n  }\n  \n  //}\n\n  \n\n}";},"./engine/dist/shaders/triangle.frag.js":function(t,n){t.exports="//#version 300 es\n\n// use lowp for solid colors to improve perf\n// https://stackoverflow.com/questions/13780609/what-does-precision-mediump-float-mean\nprecision mediump float;\nvarying vec4 vVertexColor;\n\nvoid main(void) {\n  gl_FragColor = vVertexColor;\n}";},"./engine/dist/shaders/triangle.vert.js":function(t,n){t.exports="//#version 300 es\n\nattribute vec4 aVertexPosition;\nattribute vec4 normal;\nattribute float aVertexColor;\n\nuniform mat4 uModelViewMatrix;\nuniform mat4 uProjectionMatrix;\nuniform bool magicZoom;\nuniform float nodeSize; // 0..1\nuniform float focusedGroup;\nuniform float edgeSize; // 0..1\nuniform float zoom;\nuniform float globalAlpha; // 0..1\nuniform bool darkMode;\n\nconst float MAX_NODE_SIZE = 16.0;\nconst float PI = 3.1415926535897932384626433832795;\n\nvarying vec4 vVertexColor;\n\n// vec2 rotate(vec2 v, float a) {\n// \tfloat s = sin(a);\n// \tfloat c = cos(a);\n// \tmat2 m = mat2(c, -s, s, c);\n// \treturn m * v;\n// }\n\n// https://mattdesl.svbtle.com/drawing-lines-is-hard\n// https://github.com/mattdesl/three-line-2d/blob/master/shaders/basic.js\nvoid main() {\n  //float zoomX = length(uModelViewMatrix[0]);\n  //float zoomY = length(uModelViewMatrix[1]);\n  // vec2 standardZoomVector = normalize(vec2(1.0, 0.0));\n  // vec2 zoomVector = normalize(vec2(zoomX, zoomY));\n  // float zoomAngle = dot(standardZoomVector, zoomVector);\n  // vec2 vec2Normal = vec2(normal.xy);\n  // vec2 rotatedNormal = rotate(vec2Normal, zoomAngle);\n  // vec4 newNormal = vec4(rotatedNormal.x, rotatedNormal.y, 0.0, 0.0);\n\n  vec4 newNormal = MAX_NODE_SIZE * 0.25 * edgeSize * vec4(normal.x, normal.y, 0.0, 0.0);\n\n\n  if (magicZoom) {\n    gl_Position = uProjectionMatrix * ((uModelViewMatrix * aVertexPosition) + newNormal);\n  }\n  else {\n    newNormal.x = newNormal.x * zoom * nodeSize;\n    newNormal.y = newNormal.y * zoom * nodeSize;\n    gl_Position = uProjectionMatrix * ((uModelViewMatrix * aVertexPosition) + newNormal);\n  }\n\n  //gl_Position.z = 0.0;\n  \n\n  bool isFocused = focusedGroup == -1.0 || aVertexColor == focusedGroup;\n\n  if (isFocused) {\n    gl_Position.z = -0.3;\n  }\n  else {\n    gl_Position.z = 0.0;\n  }\n\n  float validColor = mod(aVertexColor, 8.0);\n\n  if (!isFocused) {\n    if (darkMode) {\n      vVertexColor = vec4(60.0/255.0, 60.0/255.0, 60.0/255.0, globalAlpha);  \n    }\n    else {\n      vVertexColor = vec4(220.0/255.0, 220.0/255.0, 220.0/255.0, globalAlpha);\n    }\n  }\n  else if (validColor == 0.0) {\n    vVertexColor = vec4(51.0/255.0, 102.0/255.0, 204.0/255.0, globalAlpha); // 3366CC\n  }\n  else if (validColor == 1.0) {\n    vVertexColor = vec4(220.0/255.0, 57.0/255.0, 18.0/255.0, globalAlpha); // DC3912\n  }\n  else if (validColor == 2.0) {\n    vVertexColor = vec4(255.0/255.0, 153.0/255.0, 0.0/255.0, globalAlpha); // FF9900\n  }\n  else if (validColor == 3.0) {\n    vVertexColor = vec4(16.0/255.0, 150.0/255.0, 24.0/255.0, globalAlpha); // 109618\n  }\n  else if (validColor == 4.0) {\n    vVertexColor = vec4(153.0/255.0, 0.0/255.0, 153.0/255.0, globalAlpha); // 990099\n  }\n  else if (validColor == 5.0) {\n    vVertexColor = vec4(59.0/255.0, 62.0/255.0, 172.0/255.0, globalAlpha); // 3B3EAC\n  }\n  else if (validColor == 6.0) {\n    vVertexColor = vec4(0.0/255.0, 153.0/255.0, 198.0/255.0, globalAlpha); // 0099C6\n  }\n  else if (validColor == 7.0) {\n    vVertexColor = vec4(221.0/255.0, 68.0/255.0, 119.0/255.0, globalAlpha); // DD4477\n  }\n}";},"./engine/dist/styles/ElGrapho.min.css.js":function(t,n){t.exports=".el-grapho-tooltip{position:fixed;background-color:white;pointer-events:none;padding:10px;border:1px solid #333;border-radius:3px;font-family:verdana;font-size:12px;user-select:none}.el-grapho-controls{position:absolute;right:0;top:5px;opacity:0;transition:opacity .3s ease-in-out}.el-grapho-controls button{background:white;padding:5px;cursor:pointer;outline:0;border:2px solid black;border-radius:3px;margin-right:5px}.el-grapho-controls .el-grapho-step-down-control{transform:scale(1,-1)}.el-grapho-wrapper:hover .el-grapho-controls{opacity:1}.el-grapho-wrapper.el-grapho-dark-mode .el-grapho-controls button{background:black;border-color:white;color:white;border-color:#aaa}.el-grapho-wrapper.el-grapho-dark-mode .el-grapho-controls button path,.el-grapho-wrapper.el-grapho-dark-mode .el-grapho-controls button polygon,.el-grapho-wrapper.el-grapho-dark-mode .el-grapho-controls button rect{fill:white}.el-grapho-wrapper.el-grapho-select-interaction-mode{cursor:default}.el-grapho-wrapper.el-grapho-select-interaction-mode .el-grapho-controls .el-grapho-select-control{border-color:#119fe0}.el-grapho-wrapper.el-grapho-select-interaction-mode .el-grapho-controls .el-grapho-select-control path,.el-grapho-wrapper.el-grapho-select-interaction-mode .el-grapho-controls .el-grapho-select-control polygon{fill:#119fe0}.el-grapho-wrapper.el-grapho-pan-interaction-mode{cursor:move}.el-grapho-wrapper.el-grapho-pan-interaction-mode .el-grapho-controls .el-grapho-pan-control{border-color:#119fe0}.el-grapho-wrapper.el-grapho-pan-interaction-mode .el-grapho-controls .el-grapho-pan-control path,.el-grapho-wrapper.el-grapho-pan-interaction-mode .el-grapho-controls .el-grapho-pan-control polygon{fill:#119fe0}.el-grapho-wrapper.el-grapho-box-zoom-interaction-mode{cursor:zoom-in}.el-grapho-wrapper.el-grapho-box-zoom-interaction-mode .el-grapho-controls .el-grapho-box-zoom-control{border-color:#119fe0}.el-grapho-wrapper.el-grapho-box-zoom-interaction-mode .el-grapho-controls .el-grapho-box-zoom-control path,.el-grapho-wrapper.el-grapho-box-zoom-interaction-mode .el-grapho-controls .el-grapho-box-zoom-control polygon{fill:#119fe0}.el-grapho-count{position:absolute;bottom:5px;right:5px;pointer-events:none;font-family:monospace;background-color:white;border-radius:3px;padding:3px;opacity:.9}.el-grapho-count::selection{background:transparent}.el-grapho-wrapper.el-grapho-dark-mode .el-grapho-count{background-color:black;color:white}.el-grapho-box-zoom-component{position:fixed;border:1px solid #119fe0;background-color:rgba(17,159,224,0.1);pointer-events:none}.el-grapho-loading-component{width:100%;height:100%;background-color:rgba(255,255,255,0.9);position:absolute;top:0;opacity:0;transition:opacity .3s ease-in-out;pointer-events:none}.el-grapho-loading .el-grapho-loading-component{opacity:1}.spinner{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.spinner>div{width:18px;height:18px;background-color:#333;border-radius:100%;display:inline-block;-webkit-animation:sk-bouncedelay 1.4s infinite ease-in-out both;animation:sk-bouncedelay 1.4s infinite ease-in-out both}.spinner .bounce1{-webkit-animation-delay:-0.32s;animation-delay:-0.32s}.spinner .bounce2{-webkit-animation-delay:-0.16s;animation-delay:-0.16s}@-webkit-keyframes sk-bouncedelay{0%,80%,100%{-webkit-transform:scale(0)}40%{-webkit-transform:scale(1)}}@keyframes sk-bouncedelay{0%,80%,100%{-webkit-transform:scale(0);transform:scale(0)}40%{-webkit-transform:scale(1);transform:scale(1)}}.el-grapho-wrapper{display:inline-block;position:relative;background-color:white;overflow:hidden}.el-grapho-wrapper.el-grapho-select-interaction-mode{cursor:default}.el-grapho-wrapper.el-grapho-pan-interaction-mode{cursor:move}.el-grapho-wrapper.el-grapho-box-zoom-interaction-mode{cursor:zoom-in}.el-grapho-wrapper.el-grapho-dark-mode{background-color:black}\n";},"./engine/src/Color.js":function(t,n){const e={rgbToInt:function(t){return (t[0]<<16)+(t[1]<<8)+t[2]},intToRGB:function(t){return [(16711680&t)>>16,(65280&t)>>8,255&t]},hexToRgb:function(t){var n=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(t);return [parseInt(n[1],16),parseInt(n[2],16),parseInt(n[3],16)]}};t.exports=e;},"./engine/src/Dom.js":function(t,n){const e={create:function(t){let n=document.createElement("div");return n.className=t,n},closest:function(t,n){if(!document.documentElement.contains(t))return null;do{if(t.matches(n))return t;t=t.parentElement||t.parentNode;}while(null!==t&&1===t.nodeType);return null}};t.exports=e;},"./engine/src/EasingFunctions.js":function(t,n){t.exports={linear:function(t){return t},easeInQuad:function(t){return t*t},easeOutQuad:function(t){return t*(2-t)},easeInOutQuad:function(t){return t<.5?2*t*t:(4-2*t)*t-1},easeInCubic:function(t){return t*t*t},easeOutCubic:function(t){return --t*t*t+1},easeInOutCubic:function(t){return t<.5?4*t*t*t:(t-1)*(2*t-2)*(2*t-2)+1},easeInQuart:function(t){return t*t*t*t},easeOutQuart:function(t){return 1- --t*t*t*t},easeInOutQuart:function(t){return t<.5?8*t*t*t*t:1-8*--t*t*t*t},easeInQuint:function(t){return t*t*t*t*t},easeOutQuint:function(t){return 1+--t*t*t*t*t},easeInOutQuint:function(t){return t<.5?16*t*t*t*t*t:1+16*--t*t*t*t*t}};},"./engine/src/ElGrapho.js":function(t,n,e){const r=e("./engine/src/UUID.js"),o=e("./engine/src/WebGL.js"),i=e("./engine/src/Profiler.js"),u=e("./engine/src/ElGraphoCollection.js"),a=e("./engine/src/components/Controls/Controls.js"),c=e("./engine/src/components/Count/Count.js"),s=e("./engine/src/Events.js"),l=e("./node_modules/concretejs/build/concrete.min.js"),f=e("./node_modules/lodash/lodash.js"),h=e("./engine/src/Color.js"),d=e("./engine/src/Theme.js"),p=e("./engine/src/components/Tooltip/Tooltip.js"),g=e("./engine/src/formatters/NumberFormatter.js"),v=e("./engine/src/VertexBridge.js"),m=e("./engine/src/Enums.js"),x=e("./engine/src/components/BoxZoom/BoxZoom.js"),_=e("./engine/src/Dom.js"),y=e("./engine/src/components/Loading/Loading.js"),b=e("./engine/src/Labels.js"),w=e("./engine/src/layouts/Tree.js"),M=e("./engine/src/layouts/Cluster.js"),A=e("./engine/src/layouts/Chord.js"),j=e("./engine/src/layouts/ForceDirected.js"),E=e("./engine/src/layouts/Hairball.js"),I=e("./engine/src/layouts/RadialTree.js");let P=function(t){let n=this;void 0!==t.model.then?t.model.then(function(e){t.model=e,n.init(t);}):this.init(t);};P.prototype={init:function(t){this.container=t.container||document.createElement("div"),this.id=r.generate(),this.dirty=!0,this.hitDirty=!0,this.hoverDirty=!1,this.zoomX=1,this.zoomY=1,this.panX=0,this.panY=0,this.events=new s,this.model=t.model,this.fitToViewport(!1),this.width=t.width||500,this.height=t.height||500,this.steps=t.model.steps,this.nodeSize=t.nodeSize||1,this.edgeSize=t.edgeSize||.25,this.focusedGroup=-1,this.tooltips=void 0===t.tooltips||t.tooltips,this.fillContainer=void 0!==t.fillContainer&&t.fillContainer,this.glowBlend=void 0===t.glowBlend?0:t.glowBlend,this.nodeOutline=void 0===t.nodeOutline||t.nodeOutline,this.animations=[],this.wrapper=document.createElement("div"),this.wrapper.className="el-grapho-wrapper",this.wrapper.style.width=this.width+"px",this.wrapper.style.height=this.height+"px",this.container.innerHTML="",this.container.appendChild(this.wrapper),this.animations=void 0===t.animations||t.animations,this.setInteractionMode(m.interactionMode.SELECT),this.setDarkMode(void 0!==t.darkMode&&t.darkMode),this.panStart=null,this.idle=!0,this.debug=void 0!==t.debug&&t.debug,this.showArrows=void 0!==t.arrows&&t.arrows,this.tooltipTemplate=function(t,n){n.innerHTML=P.NumberFormatter.addCommas(t);},this.hoveredDataIndex=-1,this.selectedIndex=-1,this.allListeners=[];let n=this.viewport=new l.Viewport({container:this.wrapper,width:this.width,height:this.height}),e=new l.Layer({contextType:"webgl"}),i=this.hoverLayer=new l.Layer({contextType:"2d"}),a=this.labelsLayer=new l.Layer({contextType:"2d"});n.add(e),n.add(i),n.add(a),this.webgl=new o({layer:e}),u.initialized||u.init(),this.setHasLabels();let c=this.vertices=v.modelToVertices(t.model,this.showArrows);this.webgl.initBuffers(c),this.initComponents(),this.labels=new b,this.listen(),u.graphs.push(this);},setSize:function(t,n){this.width=t,this.height=n,this.wrapper.style.width=this.width+"px",this.wrapper.style.height=this.height+"px",this.viewport.setSize(t,n),this.dirty=!0,this.hitDirty=!0;},fitToViewport:function(t){let n=this.model.nodes,e=Number.POSITIVE_INFINITY,r=Number.POSITIVE_INFINITY,o=Number.NEGATIVE_INFINITY,i=Number.NEGATIVE_INFINITY;n.forEach(function(t){let n=t.x,u=t.y;e=Math.min(e,n),r=Math.min(r,u),o=Math.max(o,n),i=Math.max(i,u);});let u=o-e,a=i-r,c=e+u/2,s=r+a/2,l=1.9/u,f=1.9/a;if(t){let t=Math.min(l,f);l=t,f=t;}n.forEach(function(t){t.x=(t.x-c)*l,t.y=(t.y-s)*f;});},setHasLabels:function(){this.hasLabels=!1;let t=this.model.nodes;for(let n=0;n<t.length;n++){let e=t[n].label;if(void 0!==e&&null!==e){this.hasLabels=!0;break}}},initComponents:function(){let t=this.model;this.controls=new a({container:this.wrapper,graph:this}),this.loading=new y({container:this.wrapper}),this.debug&&(this.count=new c({container:this.wrapper}),this.count.update(t.nodes.length,t.edges.length,t.steps));},renderLabels:function(t){let n=this,e=this.width/2,r=this.height/2;this.labels.clear();let o=this.vertices.points.positions;this.model.nodes.forEach(function(t,e){let r=2*e;void 0!==t.label&&null!==t.label&&n.labels.addLabel(t.label,o[r],o[r+1]);});let i=this.labelsLayer.scene.context;i.save(),i.translate(this.width/2,this.height/2),i.scale(t,t),i.textAlign="center",i.font="12px Arial",this.darkMode?(i.fillStyle="#eee",i.strokeStyle="black"):(i.fillStyle="#333",i.strokeStyle="white"),i.lineWidth=3,i.lineJoin="round",this.labels.labelsAdded.forEach(function(o){let u=(o.x*e*n.zoomX+n.panX)/t,a=(-1*o.y*r*n.zoomY-n.panY)/t-10;i.beginPath(),i.strokeText(o.str,u,a),i.fillText(o.str,u,a);}),i.restore();},renderRings:function(t){let n=this.hoveredDataIndex,e=this.selectedIndex;if(n>=0||e>=0){let r,o,i,u=this.width/2,a=this.height/2,c=this.hoverLayer.scene.context;c.save(),c.translate(this.width/2,this.height/2),c.scale(t,t),n>=0&&(o=((r=this.model.nodes[n]).x*u*this.zoomX+this.panX)/t,i=(-1*r.y*a*this.zoomY-this.panY)/t,c.save(),this.darkMode?c.strokeStyle="white":c.strokeStyle="black",c.lineWidth=2,c.beginPath(),c.arc(o,i,5,0,2*Math.PI,!1),c.stroke(),c.restore()),e>=0&&(o=((r=this.model.nodes[e]).x*u*this.zoomX+this.panX)/t,i=(-1*r.y*a*this.zoomY-this.panY)/t,c.save(),this.darkMode?c.strokeStyle="white":c.strokeStyle="black",c.lineWidth=3,c.beginPath(),c.arc(o,i,5,0,2*Math.PI,!1),c.stroke(),c.restore()),c.restore();}},setDarkMode(t){this.darkMode=t,this.wrapper.classList.remove("el-grapho-dark-mode"),t&&this.wrapper.classList.add("el-grapho-dark-mode"),this.dirty=!0;},getMousePosition(t){let n=this.wrapper.getBoundingClientRect();return {x:t.clientX-n.left,y:t.clientY-n.top}},addListener:function(t,n,e){this.allListeners[n]=this.allListeners[n]||[],this.allListeners[n].push({o:t,on:n,fn:e}),t.addEventListener(n,e);},removeAllListeners:function(){const t=this.allListeners.length;for(let n=0;n<t;n++){let t=this.allListeners[n];t.o.removeEventListener(t.on,t.fn);}this.allListeners=[];},listen:function(){let t=this,n=this.viewport;this.on("zoom-in",function(){t.zoomIn();}),this.on("zoom-out",function(){t.zoomOut();}),this.on("reset",function(){t.reset();}),this.on("select",function(){t.setInteractionMode(m.interactionMode.SELECT);}),this.on("pan",function(){t.setInteractionMode(m.interactionMode.PAN);}),this.on("box-zoom",function(){t.setInteractionMode(m.interactionMode.BOX_ZOOM);}),this.on("step-up",function(){t.stepUp();}),this.on("step-down",function(){t.stepDown();}),this.addListener(document,"mousedown",function(n){if(!_.closest(n.target,".el-grapho-controls")&&t.interactionMode===m.interactionMode.BOX_ZOOM){let e=t.getMousePosition(n);t.zoomBoxAnchor={x:e.x,y:e.y},x.create(n.clientX,n.clientY);}}),this.addListener(n.container,"mousedown",function(n){if(!_.closest(n.target,".el-grapho-controls")&&t.interactionMode===m.interactionMode.PAN){let e=t.getMousePosition(n);t.panStart=e,p.hide();}}),this.addListener(document,"mousemove",function(n){t.interactionMode===m.interactionMode.BOX_ZOOM&&x.update(n.clientX,n.clientY);}),this.addListener(n.container,"mousemove",f.throttle(function(e){let r=t.getMousePosition(e),o=n.getIntersection(r.x,r.y);if(t.interactionMode===m.interactionMode.PAN&&t.panStart){let e={x:r.x-t.panStart.x,y:r.y-t.panStart.y};n.scene.canvas.style.marginLeft=e.x+"px",n.scene.canvas.style.marginTop=e.y+"px";}(t.panStart||t.zoomBoxAnchor)&&p.hide(),_.closest(e.target,".el-grapho-controls")||t.panStart||t.zoomBoxAnchor||(-1===o?p.hide():t.tooltips&&p.render(o,e.clientX,e.clientY,t.tooltipTemplate),o!==t.hoveredDataIndex&&(-1!==t.hoveredDataIndex&&t.fire(m.events.NODE_MOUSEOUT,{dataIndex:t.hoveredDataIndex}),t.hoveredDataIndex=o,t.hoverDirty=!0,-1!==t.hoveredDataIndex&&t.fire(m.events.NODE_MOUSEOVER,{dataIndex:t.hoveredDataIndex})));},17,{trailing:!1})),this.addListener(document,"mouseup",function(e){if(!_.closest(e.target,".el-grapho-controls")&&t.interactionMode===m.interactionMode.BOX_ZOOM){if(!t.zoomBoxAnchor)return;let r,o,i,u,a,c,s=t.getMousePosition(e);s.x>t.zoomBoxAnchor.x&&s.y>t.zoomBoxAnchor.y?(i=s.x-t.zoomBoxAnchor.x,u=s.y-t.zoomBoxAnchor.y,r=t.zoomBoxAnchor.x,o=t.zoomBoxAnchor.y):s.x>t.zoomBoxAnchor.x&&s.y<=t.zoomBoxAnchor.y?(i=s.x-t.zoomBoxAnchor.x,u=t.zoomBoxAnchor.y-s.y,r=t.zoomBoxAnchor.x,o=s.y):s.x<=t.zoomBoxAnchor.x&&s.y<=t.zoomBoxAnchor.y?(i=t.zoomBoxAnchor.x-s.x,u=t.zoomBoxAnchor.y-s.y,r=s.x,o=s.y):s.x<=t.zoomBoxAnchor.x&&s.y>t.zoomBoxAnchor.y&&(i=t.zoomBoxAnchor.x-s.x,u=s.y-t.zoomBoxAnchor.y,r=s.x,o=t.zoomBoxAnchor.y);let l=n.width,f=n.height;i<2||u<2?(a=2,c=2,i=0,u=0,r=s.x,o=s.y):(a=l/i,c=f/u);let h=f/2,d=(l/2-(r+i/2))*t.zoomX,p=(o+u/2-h)*t.zoomY;t.zoomToPoint(d,p,a,c),x.destroy(),t.zoomBoxAnchor=null;}}),this.addListener(n.container,"mouseup",function(e){if(!_.closest(e.target,".el-grapho-controls")){if(t.interactionMode===m.interactionMode.SELECT){let r=t.getMousePosition(e),o=n.getIntersection(r.x,r.y);-1===o?(t.deselectNode(),t.deselectGroup()):(t.selectNode(o),t.selectGroup(t.vertices.points.colors[o]),t.fire(m.events.NODE_CLICK,{dataIndex:o}));}if(t.interactionMode===m.interactionMode.PAN){let r=t.getMousePosition(e),o={x:r.x-t.panStart.x,y:r.y-t.panStart.y};t.panX+=o.x,t.panY-=o.y,t.panStart=null,n.scene.canvas.style.marginLeft=0,n.scene.canvas.style.marginTop=0,t.dirty=!0,t.hitDirty=!0,t.hoverDirty=!0;}}}),this.addListener(n.container,"mouseout",function(){p.hide();});},setInteractionMode:function(t){this.interactionMode=t;for(let t in m.interactionMode)this.wrapper.classList.remove("el-grapho-"+m.interactionMode[t]+"-interaction-mode");this.wrapper.classList.add("el-grapho-"+t+"-interaction-mode");},zoomToPoint:function(t,n,e,r){if(p.hide(),this.animations){this.animations=[];let o=this;this.animations.push({startVal:o.zoomX,endVal:o.zoomX*e,startTime:(new Date).getTime(),endTime:(new Date).getTime()+300,prop:"zoomX"}),this.animations.push({startVal:o.zoomY,endVal:o.zoomY*r,startTime:(new Date).getTime(),endTime:(new Date).getTime()+300,prop:"zoomY"}),this.animations.push({startVal:o.panX,endVal:(o.panX+t/o.zoomX)*e,startTime:(new Date).getTime(),endTime:(new Date).getTime()+300,prop:"panX"}),this.animations.push({startVal:o.panY,endVal:(o.panY+n/o.zoomY)*r,startTime:(new Date).getTime(),endTime:(new Date).getTime()+300,prop:"panY"}),this.dirty=!0;}else this.panX=(this.panX+t/this.zoomX)*e,this.panY=(this.panY+n/this.zoomY)*r,this.zoomX=this.zoomX*e,this.zoomY=this.zoomY*r,this.dirty=!0,this.hitDirty=!0;},zoomIn:function(){p.hide(),this.zoomToPoint(0,0,2,2);},zoomOut:function(){p.hide(),this.zoomToPoint(0,0,.5,.5);},reset:function(){if(p.hide(),this.animations){this.animations=[];let t=this;this.animations.push({startVal:t.zoomX,endVal:1,startTime:(new Date).getTime(),endTime:(new Date).getTime()+300,prop:"zoomX"}),this.animations.push({startVal:t.zoomY,endVal:1,startTime:(new Date).getTime(),endTime:(new Date).getTime()+300,prop:"zoomY"}),this.animations.push({startVal:t.panX,endVal:0,startTime:(new Date).getTime(),endTime:(new Date).getTime()+300,prop:"panX"}),this.animations.push({startVal:t.panY,endVal:0,startTime:(new Date).getTime(),endTime:(new Date).getTime()+300,prop:"panY"}),this.dirty=!0;}else this.zoomX=1,this.zoomY=1,this.panX=0,this.panY=0,this.dirty=!0,this.hitDirty=!0;},on:function(t,n){this.events.on(t,n);},fire:function(t,n){this.events.fire(t,n);},showLoading:function(){this.wrapper.classList.add("el-grapho-loading");},hideLoading:function(){this.wrapper.classList.remove("el-grapho-loading");},destroy:function(){this.removeAllListeners(),this.viewport.destroy(),u.remove(this);},selectGroup:function(t){this.focusedGroup=t,this.dirty=!0;},deselectGroup:function(){this.focusedGroup=-1,this.dirty=!0;},selectNode:function(t){this.selectedIndex=t,this.hoverDirty=!0;},deselectNode:function(){this.selectedIndex=-1,this.hoverDirty=!0;}},P.Theme=d,P.Color=h,P.Profiler=i,P.NumberFormatter=g,P.layouts={Tree:w,Cluster:M,Chord:A,ForceDirected:j,Hairball:E,RadialTree:I},t.exports=P;},"./engine/src/ElGraphoCollection.js":function(t,n,e){const r=e("./engine/src/EasingFunctions.js"),o=e("./engine/dist/styles/ElGrapho.min.css.js"),i=e("./engine/src/Enums.js");let u={graphs:[],initialized:!1,init:function(){u.injectStyles(),u.executeFrame(),u.initialized=!0;},injectStyles:function(){let t=document.getElementsByTagName("head")[0],n=document.createElement("style");n.setAttribute("type","text/css"),n.styleSheet?n.styleSheet.cssText=o:n.appendChild(document.createTextNode(o)),t.appendChild(n);},executeFrame:function(){let t=(new Date).getTime();u.graphs.forEach(function(n){let e,o,u=0,a=!0;for(;u<n.animations.length;){let e=n.animations[u];if(t<=e.endTime){let o=(t-e.startTime)/(e.endTime-e.startTime),i=e.endVal-e.startVal;n[e.prop]=e.startVal+r.easeInOutCubic(o)*i,u++;}else n[e.prop]=e.endVal,n.animations.splice(u,1),n.hitDirty=!0;n.dirty=!0,n.hoveredDataIndex=-1,n.hoverDirty=!0;}let c=Math.min(n.zoomX,n.zoomY);if(n.nodeSize*c>=1?(e=!0,o=1):(e=!1,o=n.nodeSize),n.fillContainer){let t=n.container.getBoundingClientRect(),e=t.width,r=t.height;n.width===e&&n.height===r||n.setSize(e,r);}let s=n.zoomX<1||n.zoomY<1?Math.min(n.zoomX,n.zoomY):1;if(n.hoverDirty&&(n.hoverLayer.scene.clear(),n.renderRings(s)),n.dirty){a=!1;let t=n.focusedGroup,r=n.glowBlend;n.webgl.drawScene(n.width,n.height,n.panX,n.panY,n.zoomX,n.zoomY,e,o,t,n.hoveredDataIndex,n.edgeSize,n.darkMode,r,n.nodeOutline),n.labelsLayer.scene.clear(),n.hasLabels&&n.renderLabels(s);}(n.dirty||n.hoverDirty)&&n.viewport.render(),n.hitDirty&&(a=!1,n.webgl.drawHit(n.width,n.height,n.panX,n.panY,n.zoomX,n.zoomY,e,o),n.hitDirty=!1),n.dirty=!1,n.hoverDirty=!1,n.hitDirty=!1,a&&!n.idle&&n.fire(i.events.IDLE),n.idle=a;}),requestAnimationFrame(u.executeFrame);},remove:function(t){let n=u.graphs,e=n.length;for(let r=0;r<e;r++)if(n[r].id===t.id)return n.splice(r,1),!0;return !1}};t.exports=u;},"./engine/src/Enums.js":function(t,n){t.exports={events:{IDLE:"idle",NODE_MOUSEOVER:"node-mouseover",NODE_MOUSEOUT:"node-mouseout",NODE_CLICK:"node-click"},interactionMode:{SELECT:"select",PAN:"pan",BOX_ZOOM:"box-zoom"}};},"./engine/src/Events.js":function(t,n){let e=function(){this.funcs={};};e.prototype={on:function(t,n){this.funcs[t]||(this.funcs[t]=[]),this.funcs[t].push(n);},fire:function(t,n){this.funcs[t]&&this.funcs[t].forEach(function(t){t(n);});}},t.exports=e;},"./engine/src/Labels.js":function(t,n){let e=function(){this.labelsAdded=[];};e.prototype={clear:function(){this.labelsAdded=[];},addLabel:function(t,n,e){this.labelsAdded.push({str:t,x:n,y:e,width:100,height:10});}},t.exports=e;},"./engine/src/Profiler.js":function(t,n){let e=function(t,n){return function(){let r=(new Date).getTime(),o=n.apply(this,arguments),i=(new Date).getTime()-r;return e.enabled&&console.log(t+"() took "+i+"ms"),o}};e.enabled=!1,t.exports=e;},"./engine/src/Theme.js":function(t,n,e){const r=e("./engine/src/Color.js");let o=[];["3366CC","DC3912","FF9900","109618","990099","3B3EAC","0099C6","DD4477","66AA00","B82E2E","316395","994499","22AA99","AAAA11","6633CC","E67300","8B0707","329262","5574A6","3B3EAC"].forEach(function(t){o=o.concat(r.hexToRgb(t));});const i={palette:o};t.exports=i;},"./engine/src/UUID.js":function(t,n){let e=0,r={generate:function(){return e++}};t.exports=r;},"./engine/src/VertexBridge.js":function(t,n,e){const r=e("./engine/src/Profiler.js"),o=e("./node_modules/gl-matrix/lib/gl-matrix.js").vec2,i={modelToVertices:r("VertexBridges.modelToVertices",function(t,n){let e=t.nodes,r=t.edges,i=new Float32Array(2*e.length),u=new Float32Array(e.length),a=0;e.forEach(function(t,n){i[a++]=t.x,i[a++]=t.y,u[n]=t.group;});let c=r.length,s=n?c:0,l=new Float32Array(12*c+6*s),f=new Float32Array(12*c+6*s),h=new Float32Array(6*c+6*s),d=0,p=0,g=0;function v(t,n,e,r,o,i){let u=x(t,n,r,o);l[d++]=t,l[d++]=n,f[p++]=-1*u.x,f[p++]=u.y,h[g++]=e,l[d++]=r,l[d++]=o,f[p++]=-1*u.x,f[p++]=u.y,h[g++]=i,l[d++]=t,l[d++]=n,f[p++]=u.x,f[p++]=-1*u.y,h[g++]=e,l[d++]=r,l[d++]=o,f[p++]=u.x,f[p++]=-1*u.y,h[g++]=i,l[d++]=t,l[d++]=n,f[p++]=u.x,f[p++]=-1*u.y,h[g++]=e,l[d++]=r,l[d++]=o,f[p++]=-1*u.x,f[p++]=u.y,h[g++]=i;}function m(t,n,e,r){let i=e-t,u=r-n;return o.fromValues(i,u)}function x(t,n,e,r){let i=m(t,n,e,r),u=o.normalize(o.create(),i),a=o.rotate(o.create(),u,o.create(),Math.PI/2);return {x:-1*a[0],y:a[1]}}for(let t=0;t<c;t++){let i=r[t].from,a=r[t].to,c=e[i].x,s=e[a].x,_=e[i].y,y=e[a].y,b=u[i],w=u[a];if(v(c,_,b,s,y,w),n){let t=m(c,_,s,y),n=o.scale(o.create(),t,16),e=n[0],r=n[1],i=x(c,_,s,y);l[d++]=s,l[d++]=y,f[p++]=0,f[p++]=0,h[g++]=w,l[d++]=s,l[d++]=y,f[p++]=-1*e+4*i.x,f[p++]=-1*r+-1*i.y*4,h[g++]=w,l[d++]=s,l[d++]=y,f[p++]=-1*e+-1*i.x*4,f[p++]=-1*r+4*i.y,h[g++]=w;}}return {points:{positions:i,colors:u},triangles:{positions:l,normals:f,colors:h}}})};t.exports=i;},"./engine/src/WebGL.js":function(t,n,e){const r=e("./node_modules/gl-matrix/lib/gl-matrix.js").mat4,o=e("./node_modules/concretejs/build/concrete.min.js"),i=e("./engine/dist/shaders/point.vert.js"),u=e("./engine/dist/shaders/pointStroke.vert.js"),a=e("./engine/dist/shaders/hitPoint.vert.js"),c=e("./engine/dist/shaders/triangle.vert.js"),s=e("./engine/dist/shaders/triangle.frag.js"),l=e("./engine/dist/shaders/point.frag.js"),f=e("./engine/dist/shaders/pointHit.frag.js"),h=e("./engine/src/Profiler.js");let d=function(t){this.layer=t.layer;};d.prototype={getShader:function(t,n,e){let r=e.createShader("vertex"===t?e.VERTEX_SHADER:e.FRAGMENT_SHADER);return e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(alert(e.getShaderInfoLog(r)),null)},getPointShaderProgram:function(){let t=this.layer.scene.context,n=this.getShader("vertex",i,t),e=this.getShader("fragment",l,t),r=t.createProgram();return t.attachShader(r,n),t.attachShader(r,e),t.linkProgram(r),t.getProgramParameter(r,t.LINK_STATUS)||console.error("Could not initialise shaders"),t.useProgram(r),r.vertexPositionAttribute=t.getAttribLocation(r,"aVertexPosition"),t.enableVertexAttribArray(r.vertexPositionAttribute),r.vertexColorAttribute=t.getAttribLocation(r,"aVertexColor"),t.enableVertexAttribArray(r.vertexColorAttribute),r.projectionMatrixUniform=t.getUniformLocation(r,"uProjectionMatrix"),r.modelViewMatrixUniform=t.getUniformLocation(r,"uModelViewMatrix"),r.magicZoom=t.getUniformLocation(r,"magicZoom"),r.nodeSize=t.getUniformLocation(r,"nodeSize"),r.focusedGroup=t.getUniformLocation(r,"focusedGroup"),r.zoom=t.getUniformLocation(r,"zoom"),r.globalAlpha=t.getUniformLocation(r,"globalAlpha"),r.darkMode=t.getUniformLocation(r,"darkMode"),r},getPointStrokeShaderProgram:function(){let t=this.layer.scene.context,n=this.getShader("vertex",u,t),e=this.getShader("fragment",l,t),r=t.createProgram();return t.attachShader(r,n),t.attachShader(r,e),t.linkProgram(r),t.getProgramParameter(r,t.LINK_STATUS)||console.error("Could not initialise shaders"),t.useProgram(r),r.vertexPositionAttribute=t.getAttribLocation(r,"aVertexPosition"),t.enableVertexAttribArray(r.vertexPositionAttribute),r.vertexColorAttribute=t.getAttribLocation(r,"aVertexColor"),t.enableVertexAttribArray(r.vertexColorAttribute),r.projectionMatrixUniform=t.getUniformLocation(r,"uProjectionMatrix"),r.modelViewMatrixUniform=t.getUniformLocation(r,"uModelViewMatrix"),r.magicZoom=t.getUniformLocation(r,"magicZoom"),r.nodeSize=t.getUniformLocation(r,"nodeSize"),r.focusedGroup=t.getUniformLocation(r,"focusedGroup"),r.hoverNode=t.getUniformLocation(r,"hoverNode"),r.zoom=t.getUniformLocation(r,"zoom"),r.darkMode=t.getUniformLocation(r,"darkMode"),r},getHitPointShaderProgram:function(){let t=this.layer.hit.context,n=this.getShader("vertex",a,t),e=this.getShader("fragment",f,t),r=t.createProgram();return t.attachShader(r,n),t.attachShader(r,e),t.linkProgram(r),t.getProgramParameter(r,t.LINK_STATUS)||console.error("Could not initialise shaders"),t.useProgram(r),r.vertexIndexAttribute=t.getAttribLocation(r,"aVertexIndex"),t.enableVertexAttribArray(r.vertexIndexAttribute),r.vertexPositionAttribute=t.getAttribLocation(r,"aVertexPosition"),t.enableVertexAttribArray(r.vertexPositionAttribute),r.projectionMatrixUniform=t.getUniformLocation(r,"uProjectionMatrix"),r.modelViewMatrixUniform=t.getUniformLocation(r,"uModelViewMatrix"),r.magicZoom=t.getUniformLocation(r,"magicZoom"),r.nodeSize=t.getUniformLocation(r,"nodeSize"),r.zoom=t.getUniformLocation(r,"zoom"),r},getTriangleShaderProgram:function(){let t=this.layer.scene.context,n=this.getShader("vertex",c,t),e=this.getShader("fragment",s,t),r=t.createProgram();return t.attachShader(r,n),t.attachShader(r,e),t.linkProgram(r),t.getProgramParameter(r,t.LINK_STATUS)||console.error("Could not initialise shaders"),t.useProgram(r),r.vertexPositionAttribute=t.getAttribLocation(r,"aVertexPosition"),t.enableVertexAttribArray(r.vertexPositionAttribute),r.normalsAttribute=t.getAttribLocation(r,"normal"),t.enableVertexAttribArray(r.normalsAttribute),r.vertexColorAttribute=t.getAttribLocation(r,"aVertexColor"),t.enableVertexAttribArray(r.vertexColorAttribute),r.projectionMatrixUniform=t.getUniformLocation(r,"uProjectionMatrix"),r.modelViewMatrixUniform=t.getUniformLocation(r,"uModelViewMatrix"),r.magicZoom=t.getUniformLocation(r,"magicZoom"),r.nodeSize=t.getUniformLocation(r,"nodeSize"),r.edgeSize=t.getUniformLocation(r,"edgeSize"),r.focusedGroup=t.getUniformLocation(r,"focusedGroup"),r.zoom=t.getUniformLocation(r,"zoom"),r.globalAlpha=t.getUniformLocation(r,"globalAlpha"),r.darkMode=t.getUniformLocation(r,"darkMode"),r},createIndices:function(t){let n=new Float32Array(t);return n.forEach(function(t,e){n[e]=e;}),n},initBuffers:h("WebGL.initBuffers()",function(t){if(this.buffers={},t.points){let n=t.points.positions.length/2;this.buffers.points={positions:this.createBuffer(t.points.positions,2,this.layer.scene.context),colors:this.createBuffer(t.points.colors,1,this.layer.scene.context),hitIndices:this.createBuffer(this.createIndices(n),1,this.layer.hit.context),hitPositions:this.createBuffer(t.points.positions,2,this.layer.hit.context)};}t.triangles&&(this.buffers.triangles={positions:this.createBuffer(t.triangles.positions,2,this.layer.scene.context),normals:this.createBuffer(t.triangles.normals,2,this.layer.scene.context),colors:this.createBuffer(t.triangles.colors,1,this.layer.scene.context)});}),createBuffer:function(t,n,e){let r=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW),r.itemSize=n,r.numItems=t.length/r.itemSize,r},bindBuffer:function(t,n,e){e.bindBuffer(e.ARRAY_BUFFER,t),e.vertexAttribPointer(n,t.itemSize,e.FLOAT,!1,0,0);},drawScenePoints:function(t,n,e,r,o,i,u,a){let c=this.layer.scene.context,s=this.getPointShaderProgram(),l=this.buffers.points;c.uniformMatrix4fv(s.projectionMatrixUniform,!1,t),c.uniformMatrix4fv(s.modelViewMatrixUniform,!1,n),c.uniform1i(s.magicZoom,e),c.uniform1f(s.nodeSize,r),c.uniform1f(s.focusedGroup,o),c.uniform1f(s.zoom,i),c.uniform1f(s.globalAlpha,1-u),c.uniform1i(s.darkMode,a),this.bindBuffer(l.positions,s.vertexPositionAttribute,c),this.bindBuffer(l.colors,s.vertexColorAttribute,c),c.drawArrays(c.POINTS,0,l.positions.numItems);},drawScenePointStrokes:function(t,n,e,r,o,i,u,a){let c=this.layer.scene.context,s=this.getPointStrokeShaderProgram(),l=this.buffers.points;c.uniformMatrix4fv(s.projectionMatrixUniform,!1,t),c.uniformMatrix4fv(s.modelViewMatrixUniform,!1,n),c.uniform1i(s.magicZoom,e),c.uniform1f(s.nodeSize,r),c.uniform1f(s.focusedGroup,o),c.uniform1i(s.hoverNode,i),c.uniform1f(s.zoom,u),c.uniform1i(s.darkMode,a),this.bindBuffer(l.positions,s.vertexPositionAttribute,c),this.bindBuffer(l.colors,s.vertexColorAttribute,c),c.drawArrays(c.POINTS,0,l.positions.numItems);},drawSceneTriangles:function(t,n,e,r,o,i,u,a,c){let s=this.layer.scene.context,l=this.getTriangleShaderProgram(),f=this.buffers.triangles;s.uniformMatrix4fv(l.projectionMatrixUniform,!1,t),s.uniformMatrix4fv(l.modelViewMatrixUniform,!1,n),s.uniform1i(l.magicZoom,e),s.uniform1f(l.nodeSize,r),s.uniform1f(l.edgeSize,i),s.uniform1f(l.focusedGroup,o),s.uniform1f(l.zoom,u),s.uniform1f(l.globalAlpha,1-a),s.uniform1i(l.darkMode,c),this.bindBuffer(f.positions,l.vertexPositionAttribute,s),this.bindBuffer(f.normals,l.normalsAttribute,s),this.bindBuffer(f.colors,l.vertexColorAttribute,s),s.drawArrays(s.TRIANGLES,0,f.positions.numItems);},drawScene:function(t,n,e,i,u,a,c,s,l,f,h,d,p,g){let v=this.layer,m=v.scene.context,x=Math.min(u,a),_=r.create(),y=r.create(),b=v.width/2*-1,w=v.width/2,M=v.height/2*-1,A=v.height/2;m.viewport(0,0,v.width*o.PIXEL_RATIO,v.height*o.PIXEL_RATIO),d?m.clearColor(0,0,0,1):m.clearColor(1,1,1,1),m.clear(m.COLOR_BUFFER_BIT|m.DEPTH_BUFFER_BIT),r.ortho(y,b,w,M,A,-1,11),r.translate(_,_,[e,i,0]),r.scale(_,_,[t/2,n/2,1]),r.scale(_,_,[u,a,1]),m.disable(m.DEPTH_TEST),m.disable(m.BLEND),0===p?m.enable(m.DEPTH_TEST):(m.enable(m.BLEND),m.blendFunc(m.ONE,m.ONE_MINUS_SRC_ALPHA)),this.buffers.triangles&&this.drawSceneTriangles(y,_,c,s,l,h,x,p,d),this.buffers.points&&(g&&this.drawScenePointStrokes(y,_,c,s,l,f,x,d),this.drawScenePoints(y,_,c,s,l,x,p,d));},drawHit:function(t,n,e,i,u,a,c,s){let l=this.layer,f=l.hit.context,h=Math.min(u,a),d=r.create(),p=r.create(),g=this.getHitPointShaderProgram(),v=this.buffers.points,m=l.width/2*-1,x=l.width/2,_=l.height/2*-1,y=l.height/2;f.viewport(0,0,l.width*o.PIXEL_RATIO,l.height*o.PIXEL_RATIO),f.clearColor(1,1,1,1),f.clear(f.COLOR_BUFFER_BIT|f.DEPTH_BUFFER_BIT),r.ortho(p,m,x,_,y,.01,1e5),r.translate(d,d,[e,i,-1]),r.scale(d,d,[t/2,n/2,1]),r.scale(d,d,[u,a,1]),f.uniformMatrix4fv(g.projectionMatrixUniform,!1,p),f.uniformMatrix4fv(g.modelViewMatrixUniform,!1,d),f.uniform1i(g.magicZoom,c),f.uniform1f(g.nodeSize,s),f.uniform1f(g.zoom,h),this.bindBuffer(v.hitIndices,g.vertexIndexAttribute,f),this.bindBuffer(v.hitPositions,g.vertexPositionAttribute,f),f.enable(f.DEPTH_TEST),f.drawArrays(f.POINTS,0,v.positions.numItems);}},t.exports=d;},"./engine/src/components/BoxZoom/BoxZoom.js":function(t,n,e){const r=e("./engine/src/Dom.js");let o={active:!1,x:null,y:null,el:null,create:function(t,n){o.anchorX=t,o.anchorY=n,o.destroy();let e=r.create("el-grapho-box-zoom-component");document.body.appendChild(e),o.el=e,o.active=!0;},update:function(t,n){if(o.active){let e,r,i,u;t>o.anchorX?(e=o.anchorX,r=t):(e=t,r=o.anchorX),n>o.anchorY?(i=o.anchorY,u=n):(i=n,u=o.anchorY);let a=r-e,c=u-i;o.el.style.left=Math.floor(e)+"px",o.el.style.top=Math.floor(i)+"px",o.el.style.width=Math.floor(a)+"px",o.el.style.height=Math.floor(c)+"px";}},destroy:function(){let t=document.querySelector(".el-grapho-box-zoom-component");t&&t.remove(),o.active=!1;}};t.exports=o;},"./engine/src/components/Controls/Controls.js":function(t,n,e){const r=e("./engine/dist/icons/zoomInIcon.svg.js"),o=e("./engine/dist/icons/zoomOutIcon.svg.js"),i=e("./engine/dist/icons/moveIcon.svg.js"),u=e("./engine/dist/icons/selectIcon.svg.js"),a=e("./engine/dist/icons/boxZoomIcon.svg.js"),c=e("./engine/dist/icons/resetIcon.svg.js"),s=function(t){this.graph=t.graph,this.container=t.container,this.wrapper=document.createElement("div"),this.wrapper.className="el-grapho-controls",this.container.appendChild(this.wrapper),this.selectButton=this.addButton({icon:u,evtName:"select"}),this.boxZoomIcon=this.addButton({icon:a,evtName:"box-zoom"}),this.panButton=this.addButton({icon:i,evtName:"pan"}),this.resetButton=this.addButton({icon:c,evtName:"reset"}),this.zoomInButton=this.addButton({icon:r,evtName:"zoom-in"}),this.zoomOutButton=this.addButton({icon:o,evtName:"zoom-out"});};s.prototype={addButton:function(t){let n=document.createElement("button");n.className="el-grapho-"+t.evtName+"-control";let e=this.graph;return n.innerHTML=t.icon,n.addEventListener("click",function(){e.fire(t.evtName);}),this.wrapper.appendChild(n),n}},t.exports=s;},"./engine/src/components/Count/Count.js":function(t,n,e){const r=e("./engine/src/formatters/NumberFormatter.js"),o=function(t){let n=this.wrapper=document.createElement("span");t.container.appendChild(n);};o.prototype={update:function(t,n,e){let o=r.addCommas(t)+" nodes + "+r.addCommas(n)+" edges",i=void 0===e?"":" x "+e+" steps";this.wrapper.innerHTML=o+i,this.wrapper.className="el-grapho-count";}},t.exports=o;},"./engine/src/components/Loading/Loading.js":function(t,n,e){const r=e("./engine/src/Dom.js"),o=function(t){this.container=t.container,this.wrapper=r.create("el-grapho-loading-component");this.wrapper.innerHTML='\n  <div class="spinner">\n    <div class="bounce1"></div>\n    <div class="bounce2"></div>\n    <div class="bounce3"></div>\n  </div>\n  ',this.container.appendChild(this.wrapper);};o.prototype={},t.exports=o;},"./engine/src/components/Tooltip/Tooltip.js":function(t,n,e){const r=e("./engine/src/Dom.js"),o={DEFAULT_TEMPLATE:function(t){this.wrapper.innerHTML=t;},initialized:!1,init:function(){o.wrapper=r.create("el-grapho-tooltip"),document.body.appendChild(this.wrapper),o.initialized=!0;},render:function(t,n,e,r){o.initialized||o.init(),o.wrapper.style.display="inline-block",o.wrapper.style.left=n+"px",o.wrapper.style.bottom=window.innerHeight-e+10+"px",r(t,this.wrapper);},hide:function(){o.initialized||o.init(),o.wrapper.style.display="none";}};t.exports=o;},"./engine/src/formatters/NumberFormatter.js":function(t,n){const e={addCommas:function(t){return t.toString().replace(/\B(?=(\d{3})+(?!\d))/g,",")},roundToNearestDecimalPlace:function(t,n){let e=Math.pow(10,n);return Math.round(t*e)/e}};t.exports=e;},"./engine/src/layouts/Chord.js":function(t,n){t.exports=function(t){let n=t.nodes.length;return t.nodes.forEach(function(t,e){let r=-1*Math.PI*2*e/n+Math.PI/2;t.x=Math.cos(r),t.y=Math.sin(r);}),t};},"./engine/src/layouts/Cluster.js":function(t,n){t.exports=function(t){let r={};t.nodes.forEach(function(t,n){let e=t.group;void 0===r[e]&&(r[e]=[]),r[e].push(n);});let o,i=Object.keys(r).length,u=0,a=0;for(o in r)a=Math.max(a,r[o].length);let c=1/Math.sqrt(a);for(o in r){let n,e,a=r[o],s=-2*Math.PI*u/i+Math.PI;1===i?(n=0,e=0):(n=Math.cos(s),e=Math.sin(s));let l=c,f=c/l,h=0;a.forEach(function(r){let o=Math.cos(h)*l*1,i=Math.sin(h)*l*1;t.nodes[r].x=n+o,t.nodes[r].y=e+i,l+=c*f/(2*Math.PI),h-=f=c/l;}),u++;}return t};},"./engine/src/layouts/ForceDirected.js":function(t,n,e){const r=e("./node_modules/d3-force/src/index.js");t.exports=function(t){void 0===t.steps&&(t.steps=30);let n=[],e=[];t.nodes.forEach(function(t,e){n.push({id:e,group:t.group});}),t.edges.forEach(function(t){e.push({source:t.from,target:t.to});});var o=r.forceSimulation(n).force("charge",r.forceManyBody()).force("link",r.forceLink(e).distance(20).strength(1)).force("x",r.forceX()).force("y",r.forceY());return o.tick(t.steps),o.stop(),o.nodes().forEach(function(n,e){t.nodes[e].x=n.x,t.nodes[e].y=n.y;}),t};},"./engine/src/layouts/Hairball.js":function(t,n){const e=function(t,n){n.forEach(function(n){let e,r,o=n.from,i=n.to,u=t[o].x,a=t[o].y,c=t[i].x-u,s=t[i].y-a;Math.sqrt(c*c+s*s)>0&&(e=.1*c,r=.1*s,t[o].x+=e,t[o].y+=r,t[i].x-=e,t[i].y-=r);});};t.exports=function(t){void 0===t.steps&&(t.steps=20);let n=t.nodes,r=t.edges;!function(t){let n=t.length,e=[];t.forEach(function(t){let n=t.group;void 0===e[n]&&(e[n]={count:0}),e[n].count++;});let r=0;for(let t=0;t<e.length;t++)e[t].next=r,r+=e[t].count;t.forEach(function(t){let r=t.group,o=-2*Math.PI*e[r].next++/n;t.x=.3*Math.cos(o),t.y=.3*Math.sin(o);});}(n);for(let o=1;o<t.steps;o++)e(n,r);return t};},"./engine/src/layouts/RadialTree.js":function(t,n,e){const r=e("./engine/src/layouts/utils/buildTreeLevels.js");t.exports=function(t){return r(t).forEach(function(n,e){let r=0===e?0:1-Math.pow(.9,e);n.forEach(function(n){let e=n.index,o=Math.PI*n.pos;t.nodes[e].x=r*Math.cos(o),t.nodes[e].y=r*Math.sin(o);});}),t};},"./engine/src/layouts/Tree.js":function(t,n,e){const r=e("./engine/src/layouts/utils/buildTreeLevels.js");t.exports=function(t){let n=r(t),e=n.length,o=Math.pow(1.3,n.length-1);return n.forEach(function(n,r){n.forEach(function(n){let i=n.index,u=Math.pow(1.3,e-r)/o;t.nodes[i].x=n.pos,t.nodes[i].y=u;});}),t};},"./engine/src/layouts/utils/buildTreeLevels.js":function(t,n){let e=function(t,n){t.totalDescendants+=n,t.parent&&e(t.parent,n);},r=function(t,n,o,i,u,a){if(n.children=[],n.left=o,n.right=i,n.pos=(o+i)/2,n.level=u,n.group=t.group||0,n.index=t.index,a(n),t.children){let c=(i-o)/t.children.length,s=o;for(let e=0;e<t.children.length;e++){let o=s+c;n.children.push({parent:n}),r(t.children[e],n.children[e],s,o,u+1,a),s+=c;}e(n,t.children.length);}};t.exports=function(t){let n=function(t){let n=t.nodes,e=t.edges,r={};for(var o in n.forEach(function(t,n){r[n]={index:n,group:t.group,children:[],hasParent:!1};}),e.forEach(function(t){let n=t.from,e=t.to;r[n].children.push(r[e]),r[e].parent=r[n],r[e].hasParent=!0;}),r){let t=r[o];if(!t.hasParent)return t}return null}(t),e=[],o=0,i=0,u=[];r(n,{},-1,1,0,function(t){e[o]=t,o++,t.level>i&&(i=t.level);}),e.sort(function(t,n){return t.index-n.index});for(let t=0;t<=i;t++)u.push([]);return e.forEach(function(t,n){t.index=n,u[t.level].push(t);}),u};},"./node_modules/concretejs/build/concrete.min.js":function(t,n,e){var r,o={},i=0;o.PIXEL_RATIO=window&&window.devicePixelRatio||1,o.viewports=[],o.Viewport=function(t){t||(t={}),this.container=t.container,this.layers=[],this.id=i++,this.scene=new o.Scene,this.setSize(t.width||0,t.height||0),t.container.innerHTML="",t.container.appendChild(this.scene.canvas),o.viewports.push(this);},o.Viewport.prototype={add:function(t){return this.layers.push(t),t.setSize(t.width||this.width,t.height||this.height),t.viewport=this},setSize:function(t,n){return this.width=t,this.height=n,this.scene.setSize(t,n),this.layers.forEach(function(e){e.setSize(t,n);}),this},getIntersection:function(t,n){var e,r,o=this.layers;for(e=o.length-1;0<=e;e--)if(0<=(r=o[e].hit.getIntersection(t,n)))return r;return -1},getIndex:function(){var t,n=o.viewports,e=n.length,r=0;for(r=0;r<e;r++)if(t=n[r],this.id===t.id)return r;return null},destroy:function(){this.layers.forEach(function(t){t.destroy();}),this.container.innerHTML="",o.viewports.splice(this.getIndex(),1);},render:function(){var t=this.scene;t.clear(),this.layers.forEach(function(n){n.visible&&t.context.drawImage(n.scene.canvas,0,0,n.width,n.height);});}},o.Layer=function(t){t||(t={}),this.x=0,this.y=0,this.width=0,this.height=0,this.visible=!0,this.id=i++,this.hit=new o.Hit({contextType:t.contextType}),this.scene=new o.Scene({contextType:t.contextType}),t.x&&t.y&&this.setPosition(t.x,t.y),t.width&&t.height&&this.setSize(t.width,t.height);},o.Layer.prototype={setPosition:function(t,n){return this.x=t,this.y=n,this},setSize:function(t,n){return this.width=t,this.height=n,this.scene.setSize(t,n),this.hit.setSize(t,n),this},moveUp:function(){var t=this.getIndex(),n=this.viewport.layers;return t<n.length-1&&(n[t]=n[t+1],n[t+1]=this),this},moveDown:function(){var t=this.getIndex(),n=this.viewport.layers;return 0<t&&(n[t]=n[t-1],n[t-1]=this),this},moveToTop:function(){var t=this.getIndex(),n=this.viewport.layers;n.splice(t,1),n.push(this);},moveToBottom:function(){var t=this.getIndex(),n=this.viewport.layers;return n.splice(t,1),n.unshift(this),this},getIndex:function(){var t,n=this.viewport.layers,e=n.length,r=0;for(r=0;r<e;r++)if(t=n[r],this.id===t.id)return r;return null},destroy:function(){this.viewport.layers.splice(this.getIndex(),1);}},o.Scene=function(t){t||(t={}),this.width=0,this.height=0,this.contextType=t.contextType||"2d",this.id=i++,this.canvas=document.createElement("canvas"),this.canvas.className="concrete-scene-canvas",this.canvas.style.display="inline-block",this.context=this.canvas.getContext(this.contextType),t.width&&t.height&&this.setSize(t.width,t.height);},o.Scene.prototype={setSize:function(t,n){return this.width=t,this.height=n,this.id=i++,this.canvas.width=t*o.PIXEL_RATIO,this.canvas.style.width=t+"px",this.canvas.height=n*o.PIXEL_RATIO,this.canvas.style.height=n+"px","2d"===this.contextType&&1!==o.PIXEL_RATIO&&this.context.scale(o.PIXEL_RATIO,o.PIXEL_RATIO),this},clear:function(){var t=this.context;return "2d"===this.contextType?t.clearRect(0,0,this.width*o.PIXEL_RATIO,this.height*o.PIXEL_RATIO):t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),this},toImage:function(t){var n=this,e=new Image,r=this.canvas.toDataURL("image/png");e.onload=function(){e.width=n.width,e.height=n.height,t(e);},e.src=r;},download:function(t){this.canvas.toBlob(function(n){var e,r=document.createElement("a"),o=URL.createObjectURL(n),i=t.fileName||"canvas.png";r.setAttribute("href",o),r.setAttribute("target","_blank"),r.setAttribute("download",i),document.createEvent?((e=document.createEvent("MouseEvents")).initEvent("click",!0,!0),r.dispatchEvent(e)):r.click&&r.click();});}},o.Hit=function(t){t||(t={}),this.width=0,this.height=0,this.contextType=t.contextType||"2d",this.canvas=document.createElement("canvas"),this.canvas.className="concrete-hit-canvas",this.canvas.style.display="none",this.canvas.style.position="relative",this.context=this.canvas.getContext(this.contextType,{preserveDrawingBuffer:!0,antialias:!1}),t.width&&t.height&&this.setSize(t.width,t.height);},o.Hit.prototype={setSize:function(t,n){return this.width=t,this.height=n,this.canvas.width=t*o.PIXEL_RATIO,this.canvas.style.width=t+"px",this.canvas.height=n*o.PIXEL_RATIO,this.canvas.style.height=n+"px",this},clear:function(){var t=this.context;return "2d"===this.contextType?t.clearRect(0,0,this.width*o.PIXEL_RATIO,this.height*o.PIXEL_RATIO):t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),this},getIntersection:function(t,n){var e,r=this.context;if(t=Math.round(t),n=Math.round(n),t<0||n<0||t>this.width||n>this.height)return -1;if("2d"===this.contextType){if(0===(e=r.getImageData(t,n,1,1).data)[3])return -1}else if(e=new Uint8Array(4),r.readPixels(t*o.PIXEL_RATIO,(this.height-n-1)*o.PIXEL_RATIO,1,1,r.RGBA,r.UNSIGNED_BYTE,e),255===e[0]&&255===e[1]&&255===e[2])return -1;return this.rgbToInt(e)},getColorFromIndex:function(t){var n=this.intToRGB(t);return "rgb("+n[0]+", "+n[1]+", "+n[2]+")"},rgbToInt:function(t){return (t[0]<<16)+(t[1]<<8)+t[2]},intToRGB:function(t){return [(16711680&t)>>16,(65280&t)>>8,255&t]}},function(i){void 0===(r=function(){return o}.call(n,e,n,t))||(t.exports=r);}();},"./node_modules/d3-dispatch/src/dispatch.js":function(t,n,e){e.r(n);var r={value:function(){}};function o(){for(var t,n=0,e=arguments.length,r={};n<e;++n){if(!(t=arguments[n]+"")||t in r)throw new Error("illegal type: "+t);r[t]=[];}return new i(r)}function i(t){this._=t;}function u(t,n){for(var e,r=0,o=t.length;r<o;++r)if((e=t[r]).name===n)return e.value}function a(t,n,e){for(var o=0,i=t.length;o<i;++o)if(t[o].name===n){t[o]=r,t=t.slice(0,o).concat(t.slice(o+1));break}return null!=e&&t.push({name:n,value:e}),t}i.prototype=o.prototype={constructor:i,on:function(t,n){var e,r,o=this._,i=(r=o,(t+"").trim().split(/^|\s+/).map(function(t){var n="",e=t.indexOf(".");if(e>=0&&(n=t.slice(e+1),t=t.slice(0,e)),t&&!r.hasOwnProperty(t))throw new Error("unknown type: "+t);return {type:t,name:n}})),c=-1,s=i.length;if(!(arguments.length<2)){if(null!=n&&"function"!=typeof n)throw new Error("invalid callback: "+n);for(;++c<s;)if(e=(t=i[c]).type)o[e]=a(o[e],t.name,n);else if(null==n)for(e in o)o[e]=a(o[e],t.name,null);return this}for(;++c<s;)if((e=(t=i[c]).type)&&(e=u(o[e],t.name)))return e},copy:function(){var t={},n=this._;for(var e in n)t[e]=n[e].slice();return new i(t)},call:function(t,n){if((e=arguments.length-2)>0)for(var e,r,o=new Array(e),i=0;i<e;++i)o[i]=arguments[i+2];if(!this._.hasOwnProperty(t))throw new Error("unknown type: "+t);for(i=0,e=(r=this._[t]).length;i<e;++i)r[i].value.apply(n,o);},apply:function(t,n,e){if(!this._.hasOwnProperty(t))throw new Error("unknown type: "+t);for(var r=this._[t],o=0,i=r.length;o<i;++o)r[o].value.apply(n,e);}},n.default=o;},"./node_modules/d3-dispatch/src/index.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-dispatch/src/dispatch.js");e.d(n,"dispatch",function(){return r.default});},"./node_modules/d3-force/src/center.js":function(t,n,e){e.r(n),n.default=function(t,n){var e;function r(){var r,o,i=e.length,u=0,a=0;for(r=0;r<i;++r)u+=(o=e[r]).x,a+=o.y;for(u=u/i-t,a=a/i-n,r=0;r<i;++r)(o=e[r]).x-=u,o.y-=a;}return null==t&&(t=0),null==n&&(n=0),r.initialize=function(t){e=t;},r.x=function(n){return arguments.length?(t=+n,r):t},r.y=function(t){return arguments.length?(n=+t,r):n},r};},"./node_modules/d3-force/src/collide.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-quadtree/src/index.js"),o=e("./node_modules/d3-force/src/constant.js"),i=e("./node_modules/d3-force/src/jiggle.js");function u(t){return t.x+t.vx}function a(t){return t.y+t.vy}n.default=function(t){var n,e,c=1,s=1;function l(){for(var t,o,l,h,d,p,g,v=n.length,m=0;m<s;++m)for(o=Object(r.quadtree)(n,u,a).visitAfter(f),t=0;t<v;++t)l=n[t],p=e[l.index],g=p*p,h=l.x+l.vx,d=l.y+l.vy,o.visit(x);function x(t,n,e,r,o){var u=t.data,a=t.r,s=p+a;if(!u)return n>h+s||r<h-s||e>d+s||o<d-s;if(u.index>l.index){var f=h-u.x-u.vx,v=d-u.y-u.vy,m=f*f+v*v;m<s*s&&(0===f&&(m+=(f=Object(i.default)())*f),0===v&&(m+=(v=Object(i.default)())*v),m=(s-(m=Math.sqrt(m)))/m*c,l.vx+=(f*=m)*(s=(a*=a)/(g+a)),l.vy+=(v*=m)*s,u.vx-=f*(s=1-s),u.vy-=v*s);}}}function f(t){if(t.data)return t.r=e[t.data.index];for(var n=t.r=0;n<4;++n)t[n]&&t[n].r>t.r&&(t.r=t[n].r);}function h(){if(n){var r,o,i=n.length;for(e=new Array(i),r=0;r<i;++r)o=n[r],e[o.index]=+t(o,r,n);}}return "function"!=typeof t&&(t=Object(o.default)(null==t?1:+t)),l.initialize=function(t){n=t,h();},l.iterations=function(t){return arguments.length?(s=+t,l):s},l.strength=function(t){return arguments.length?(c=+t,l):c},l.radius=function(n){return arguments.length?(t="function"==typeof n?n:Object(o.default)(+n),h(),l):t},l};},"./node_modules/d3-force/src/constant.js":function(t,n,e){e.r(n),n.default=function(t){return function(){return t}};},"./node_modules/d3-force/src/index.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-force/src/center.js");e.d(n,"forceCenter",function(){return r.default});var o=e("./node_modules/d3-force/src/collide.js");e.d(n,"forceCollide",function(){return o.default});var i=e("./node_modules/d3-force/src/link.js");e.d(n,"forceLink",function(){return i.default});var u=e("./node_modules/d3-force/src/manyBody.js");e.d(n,"forceManyBody",function(){return u.default});var a=e("./node_modules/d3-force/src/radial.js");e.d(n,"forceRadial",function(){return a.default});var c=e("./node_modules/d3-force/src/simulation.js");e.d(n,"forceSimulation",function(){return c.default});var s=e("./node_modules/d3-force/src/x.js");e.d(n,"forceX",function(){return s.default});var l=e("./node_modules/d3-force/src/y.js");e.d(n,"forceY",function(){return l.default});},"./node_modules/d3-force/src/jiggle.js":function(t,n,e){e.r(n),n.default=function(){return 1e-6*(Math.random()-.5)};},"./node_modules/d3-force/src/link.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-force/src/constant.js"),o=e("./node_modules/d3-force/src/jiggle.js");function i(t){return t.index}function u(t,n){var e=t.get(n);if(!e)throw new Error("missing: "+n);return e}n.default=function(t){var n,e,a,c,s,l=i,f=function(t){return 1/Math.min(c[t.source.index],c[t.target.index])},h=Object(r.default)(30),d=1;function p(r){for(var i=0,u=t.length;i<d;++i)for(var a,c,l,f,h,p,g,v=0;v<u;++v)c=(a=t[v]).source,f=(l=a.target).x+l.vx-c.x-c.vx||Object(o.default)(),h=l.y+l.vy-c.y-c.vy||Object(o.default)(),f*=p=((p=Math.sqrt(f*f+h*h))-e[v])/p*r*n[v],h*=p,l.vx-=f*(g=s[v]),l.vy-=h*g,c.vx+=f*(g=1-g),c.vy+=h*g;}function g(){if(a){var r,o,i=a.length,f=t.length,h=new Map(a.map((t,n)=>[l(t,n,a),t]));for(r=0,c=new Array(i);r<f;++r)(o=t[r]).index=r,"object"!=typeof o.source&&(o.source=u(h,o.source)),"object"!=typeof o.target&&(o.target=u(h,o.target)),c[o.source.index]=(c[o.source.index]||0)+1,c[o.target.index]=(c[o.target.index]||0)+1;for(r=0,s=new Array(f);r<f;++r)o=t[r],s[r]=c[o.source.index]/(c[o.source.index]+c[o.target.index]);n=new Array(f),v(),e=new Array(f),m();}}function v(){if(a)for(var e=0,r=t.length;e<r;++e)n[e]=+f(t[e],e,t);}function m(){if(a)for(var n=0,r=t.length;n<r;++n)e[n]=+h(t[n],n,t);}return null==t&&(t=[]),p.initialize=function(t){a=t,g();},p.links=function(n){return arguments.length?(t=n,g(),p):t},p.id=function(t){return arguments.length?(l=t,p):l},p.iterations=function(t){return arguments.length?(d=+t,p):d},p.strength=function(t){return arguments.length?(f="function"==typeof t?t:Object(r.default)(+t),v(),p):f},p.distance=function(t){return arguments.length?(h="function"==typeof t?t:Object(r.default)(+t),m(),p):h},p};},"./node_modules/d3-force/src/manyBody.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-quadtree/src/index.js"),o=e("./node_modules/d3-force/src/constant.js"),i=e("./node_modules/d3-force/src/jiggle.js"),u=e("./node_modules/d3-force/src/simulation.js");n.default=function(){var t,n,e,a,c=Object(o.default)(-30),s=1,l=1/0,f=.81;function h(o){var i,a=t.length,c=Object(r.quadtree)(t,u.x,u.y).visitAfter(p);for(e=o,i=0;i<a;++i)n=t[i],c.visit(g);}function d(){if(t){var n,e,r=t.length;for(a=new Array(r),n=0;n<r;++n)e=t[n],a[e.index]=+c(e,n,t);}}function p(t){var n,e,r,o,i,u=0,c=0;if(t.length){for(r=o=i=0;i<4;++i)(n=t[i])&&(e=Math.abs(n.value))&&(u+=n.value,c+=e,r+=e*n.x,o+=e*n.y);t.x=r/c,t.y=o/c;}else {(n=t).x=n.data.x,n.y=n.data.y;do{u+=a[n.data.index];}while(n=n.next)}t.value=u;}function g(t,r,o,u){if(!t.value)return !0;var c=t.x-n.x,h=t.y-n.y,d=u-r,p=c*c+h*h;if(d*d/f<p)return p<l&&(0===c&&(p+=(c=Object(i.default)())*c),0===h&&(p+=(h=Object(i.default)())*h),p<s&&(p=Math.sqrt(s*p)),n.vx+=c*t.value*e/p,n.vy+=h*t.value*e/p),!0;if(!(t.length||p>=l)){(t.data!==n||t.next)&&(0===c&&(p+=(c=Object(i.default)())*c),0===h&&(p+=(h=Object(i.default)())*h),p<s&&(p=Math.sqrt(s*p)));do{t.data!==n&&(d=a[t.data.index]*e/p,n.vx+=c*d,n.vy+=h*d);}while(t=t.next)}}return h.initialize=function(n){t=n,d();},h.strength=function(t){return arguments.length?(c="function"==typeof t?t:Object(o.default)(+t),d(),h):c},h.distanceMin=function(t){return arguments.length?(s=t*t,h):Math.sqrt(s)},h.distanceMax=function(t){return arguments.length?(l=t*t,h):Math.sqrt(l)},h.theta=function(t){return arguments.length?(f=t*t,h):Math.sqrt(f)},h};},"./node_modules/d3-force/src/radial.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-force/src/constant.js");n.default=function(t,n,e){var o,i,u,a=Object(r.default)(.1);function c(t){for(var r=0,a=o.length;r<a;++r){var c=o[r],s=c.x-n||1e-6,l=c.y-e||1e-6,f=Math.sqrt(s*s+l*l),h=(u[r]-f)*i[r]*t/f;c.vx+=s*h,c.vy+=l*h;}}function s(){if(o){var n,e=o.length;for(i=new Array(e),u=new Array(e),n=0;n<e;++n)u[n]=+t(o[n],n,o),i[n]=isNaN(u[n])?0:+a(o[n],n,o);}}return "function"!=typeof t&&(t=Object(r.default)(+t)),null==n&&(n=0),null==e&&(e=0),c.initialize=function(t){o=t,s();},c.strength=function(t){return arguments.length?(a="function"==typeof t?t:Object(r.default)(+t),s(),c):a},c.radius=function(n){return arguments.length?(t="function"==typeof n?n:Object(r.default)(+n),s(),c):t},c.x=function(t){return arguments.length?(n=+t,c):n},c.y=function(t){return arguments.length?(e=+t,c):e},c};},"./node_modules/d3-force/src/simulation.js":function(t,n,e){e.r(n),e.d(n,"x",function(){return i}),e.d(n,"y",function(){return u});var r=e("./node_modules/d3-dispatch/src/index.js"),o=e("./node_modules/d3-timer/src/index.js");function i(t){return t.x}function u(t){return t.y}var a=10,c=Math.PI*(3-Math.sqrt(5));n.default=function(t){var n,e=1,i=.001,u=1-Math.pow(i,1/300),s=0,l=.6,f=new Map,h=Object(o.timer)(p),d=Object(r.dispatch)("tick","end");function p(){g(),d.call("tick",n),e<i&&(h.stop(),d.call("end",n));}function g(r){var o,i,a=t.length;void 0===r&&(r=1);for(var c=0;c<r;++c)for(e+=(s-e)*u,f.forEach(function(t){t(e);}),o=0;o<a;++o)null==(i=t[o]).fx?i.x+=i.vx*=l:(i.x=i.fx,i.vx=0),null==i.fy?i.y+=i.vy*=l:(i.y=i.fy,i.vy=0);return n}function v(){for(var n,e=0,r=t.length;e<r;++e){if((n=t[e]).index=e,null!=n.fx&&(n.x=n.fx),null!=n.fy&&(n.y=n.fy),isNaN(n.x)||isNaN(n.y)){var o=a*Math.sqrt(e),i=e*c;n.x=o*Math.cos(i),n.y=o*Math.sin(i);}(isNaN(n.vx)||isNaN(n.vy))&&(n.vx=n.vy=0);}}function m(n){return n.initialize&&n.initialize(t),n}return null==t&&(t=[]),v(),n={tick:g,restart:function(){return h.restart(p),n},stop:function(){return h.stop(),n},nodes:function(e){return arguments.length?(t=e,v(),f.forEach(m),n):t},alpha:function(t){return arguments.length?(e=+t,n):e},alphaMin:function(t){return arguments.length?(i=+t,n):i},alphaDecay:function(t){return arguments.length?(u=+t,n):+u},alphaTarget:function(t){return arguments.length?(s=+t,n):s},velocityDecay:function(t){return arguments.length?(l=1-t,n):1-l},force:function(t,e){return arguments.length>1?(null==e?f.delete(t):f.set(t,m(e)),n):f.get(t)},find:function(n,e,r){var o,i,u,a,c,s=0,l=t.length;for(null==r?r=1/0:r*=r,s=0;s<l;++s)(u=(o=n-(a=t[s]).x)*o+(i=e-a.y)*i)<r&&(c=a,r=u);return c},on:function(t,e){return arguments.length>1?(d.on(t,e),n):d.on(t)}}};},"./node_modules/d3-force/src/x.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-force/src/constant.js");n.default=function(t){var n,e,o,i=Object(r.default)(.1);function u(t){for(var r,i=0,u=n.length;i<u;++i)(r=n[i]).vx+=(o[i]-r.x)*e[i]*t;}function a(){if(n){var r,u=n.length;for(e=new Array(u),o=new Array(u),r=0;r<u;++r)e[r]=isNaN(o[r]=+t(n[r],r,n))?0:+i(n[r],r,n);}}return "function"!=typeof t&&(t=Object(r.default)(null==t?0:+t)),u.initialize=function(t){n=t,a();},u.strength=function(t){return arguments.length?(i="function"==typeof t?t:Object(r.default)(+t),a(),u):i},u.x=function(n){return arguments.length?(t="function"==typeof n?n:Object(r.default)(+n),a(),u):t},u};},"./node_modules/d3-force/src/y.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-force/src/constant.js");n.default=function(t){var n,e,o,i=Object(r.default)(.1);function u(t){for(var r,i=0,u=n.length;i<u;++i)(r=n[i]).vy+=(o[i]-r.y)*e[i]*t;}function a(){if(n){var r,u=n.length;for(e=new Array(u),o=new Array(u),r=0;r<u;++r)e[r]=isNaN(o[r]=+t(n[r],r,n))?0:+i(n[r],r,n);}}return "function"!=typeof t&&(t=Object(r.default)(null==t?0:+t)),u.initialize=function(t){n=t,a();},u.strength=function(t){return arguments.length?(i="function"==typeof t?t:Object(r.default)(+t),a(),u):i},u.y=function(n){return arguments.length?(t="function"==typeof n?n:Object(r.default)(+n),a(),u):t},u};},"./node_modules/d3-quadtree/src/add.js":function(t,n,e){function r(t,n,e,r){if(isNaN(n)||isNaN(e))return t;var o,i,u,a,c,s,l,f,h,d=t._root,p={data:r},g=t._x0,v=t._y0,m=t._x1,x=t._y1;if(!d)return t._root=p,t;for(;d.length;)if((s=n>=(i=(g+m)/2))?g=i:m=i,(l=e>=(u=(v+x)/2))?v=u:x=u,o=d,!(d=d[f=l<<1|s]))return o[f]=p,t;if(a=+t._x.call(null,d.data),c=+t._y.call(null,d.data),n===a&&e===c)return p.next=d,o?o[f]=p:t._root=p,t;do{o=o?o[f]=new Array(4):t._root=new Array(4),(s=n>=(i=(g+m)/2))?g=i:m=i,(l=e>=(u=(v+x)/2))?v=u:x=u;}while((f=l<<1|s)==(h=(c>=u)<<1|a>=i));return o[h]=d,o[f]=p,t}function o(t){var n,e,o,i,u=t.length,a=new Array(u),c=new Array(u),s=1/0,l=1/0,f=-1/0,h=-1/0;for(e=0;e<u;++e)isNaN(o=+this._x.call(null,n=t[e]))||isNaN(i=+this._y.call(null,n))||(a[e]=o,c[e]=i,o<s&&(s=o),o>f&&(f=o),i<l&&(l=i),i>h&&(h=i));if(s>f||l>h)return this;for(this.cover(s,l).cover(f,h),e=0;e<u;++e)r(this,a[e],c[e],t[e]);return this}e.r(n),e.d(n,"addAll",function(){return o}),n.default=function(t){var n=+this._x.call(null,t),e=+this._y.call(null,t);return r(this.cover(n,e),n,e,t)};},"./node_modules/d3-quadtree/src/cover.js":function(t,n,e){e.r(n),n.default=function(t,n){if(isNaN(t=+t)||isNaN(n=+n))return this;var e=this._x0,r=this._y0,o=this._x1,i=this._y1;if(isNaN(e))o=(e=Math.floor(t))+1,i=(r=Math.floor(n))+1;else {for(var u,a,c=o-e,s=this._root;e>t||t>=o||r>n||n>=i;)switch(a=(n<r)<<1|t<e,(u=new Array(4))[a]=s,s=u,c*=2,a){case 0:o=e+c,i=r+c;break;case 1:e=o-c,i=r+c;break;case 2:o=e+c,r=i-c;break;case 3:e=o-c,r=i-c;}this._root&&this._root.length&&(this._root=s);}return this._x0=e,this._y0=r,this._x1=o,this._y1=i,this};},"./node_modules/d3-quadtree/src/data.js":function(t,n,e){e.r(n),n.default=function(){var t=[];return this.visit(function(n){if(!n.length)do{t.push(n.data);}while(n=n.next)}),t};},"./node_modules/d3-quadtree/src/extent.js":function(t,n,e){e.r(n),n.default=function(t){return arguments.length?this.cover(+t[0][0],+t[0][1]).cover(+t[1][0],+t[1][1]):isNaN(this._x0)?void 0:[[this._x0,this._y0],[this._x1,this._y1]]};},"./node_modules/d3-quadtree/src/find.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-quadtree/src/quad.js");n.default=function(t,n,e){var o,i,u,a,c,s,l,f=this._x0,h=this._y0,d=this._x1,p=this._y1,g=[],v=this._root;for(v&&g.push(new r.default(v,f,h,d,p)),null==e?e=1/0:(f=t-e,h=n-e,d=t+e,p=n+e,e*=e);s=g.pop();)if(!(!(v=s.node)||(i=s.x0)>d||(u=s.y0)>p||(a=s.x1)<f||(c=s.y1)<h))if(v.length){var m=(i+a)/2,x=(u+c)/2;g.push(new r.default(v[3],m,x,a,c),new r.default(v[2],i,x,m,c),new r.default(v[1],m,u,a,x),new r.default(v[0],i,u,m,x)),(l=(n>=x)<<1|t>=m)&&(s=g[g.length-1],g[g.length-1]=g[g.length-1-l],g[g.length-1-l]=s);}else {var _=t-+this._x.call(null,v.data),y=n-+this._y.call(null,v.data),b=_*_+y*y;if(b<e){var w=Math.sqrt(e=b);f=t-w,h=n-w,d=t+w,p=n+w,o=v.data;}}return o};},"./node_modules/d3-quadtree/src/index.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-quadtree/src/quadtree.js");e.d(n,"quadtree",function(){return r.default});},"./node_modules/d3-quadtree/src/quad.js":function(t,n,e){e.r(n),n.default=function(t,n,e,r,o){this.node=t,this.x0=n,this.y0=e,this.x1=r,this.y1=o;};},"./node_modules/d3-quadtree/src/quadtree.js":function(t,n,e){e.r(n),e.d(n,"default",function(){return g});var r=e("./node_modules/d3-quadtree/src/add.js"),o=e("./node_modules/d3-quadtree/src/cover.js"),i=e("./node_modules/d3-quadtree/src/data.js"),u=e("./node_modules/d3-quadtree/src/extent.js"),a=e("./node_modules/d3-quadtree/src/find.js"),c=e("./node_modules/d3-quadtree/src/remove.js"),s=e("./node_modules/d3-quadtree/src/root.js"),l=e("./node_modules/d3-quadtree/src/size.js"),f=e("./node_modules/d3-quadtree/src/visit.js"),h=e("./node_modules/d3-quadtree/src/visitAfter.js"),d=e("./node_modules/d3-quadtree/src/x.js"),p=e("./node_modules/d3-quadtree/src/y.js");function g(t,n,e){var r=new v(null==n?d.defaultX:n,null==e?p.defaultY:e,NaN,NaN,NaN,NaN);return null==t?r:r.addAll(t)}function v(t,n,e,r,o,i){this._x=t,this._y=n,this._x0=e,this._y0=r,this._x1=o,this._y1=i,this._root=void 0;}function m(t){for(var n={data:t.data},e=n;t=t.next;)e=e.next={data:t.data};return n}var x=g.prototype=v.prototype;x.copy=function(){var t,n,e=new v(this._x,this._y,this._x0,this._y0,this._x1,this._y1),r=this._root;if(!r)return e;if(!r.length)return e._root=m(r),e;for(t=[{source:r,target:e._root=new Array(4)}];r=t.pop();)for(var o=0;o<4;++o)(n=r.source[o])&&(n.length?t.push({source:n,target:r.target[o]=new Array(4)}):r.target[o]=m(n));return e},x.add=r.default,x.addAll=r.addAll,x.cover=o.default,x.data=i.default,x.extent=u.default,x.find=a.default,x.remove=c.default,x.removeAll=c.removeAll,x.root=s.default,x.size=l.default,x.visit=f.default,x.visitAfter=h.default,x.x=d.default,x.y=p.default;},"./node_modules/d3-quadtree/src/remove.js":function(t,n,e){function r(t){for(var n=0,e=t.length;n<e;++n)this.remove(t[n]);return this}e.r(n),e.d(n,"removeAll",function(){return r}),n.default=function(t){if(isNaN(i=+this._x.call(null,t))||isNaN(u=+this._y.call(null,t)))return this;var n,e,r,o,i,u,a,c,s,l,f,h,d=this._root,p=this._x0,g=this._y0,v=this._x1,m=this._y1;if(!d)return this;if(d.length)for(;;){if((s=i>=(a=(p+v)/2))?p=a:v=a,(l=u>=(c=(g+m)/2))?g=c:m=c,n=d,!(d=d[f=l<<1|s]))return this;if(!d.length)break;(n[f+1&3]||n[f+2&3]||n[f+3&3])&&(e=n,h=f);}for(;d.data!==t;)if(r=d,!(d=d.next))return this;return (o=d.next)&&delete d.next,r?(o?r.next=o:delete r.next,this):n?(o?n[f]=o:delete n[f],(d=n[0]||n[1]||n[2]||n[3])&&d===(n[3]||n[2]||n[1]||n[0])&&!d.length&&(e?e[h]=d:this._root=d),this):(this._root=o,this)};},"./node_modules/d3-quadtree/src/root.js":function(t,n,e){e.r(n),n.default=function(){return this._root};},"./node_modules/d3-quadtree/src/size.js":function(t,n,e){e.r(n),n.default=function(){var t=0;return this.visit(function(n){if(!n.length)do{++t;}while(n=n.next)}),t};},"./node_modules/d3-quadtree/src/visit.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-quadtree/src/quad.js");n.default=function(t){var n,e,o,i,u,a,c=[],s=this._root;for(s&&c.push(new r.default(s,this._x0,this._y0,this._x1,this._y1));n=c.pop();)if(!t(s=n.node,o=n.x0,i=n.y0,u=n.x1,a=n.y1)&&s.length){var l=(o+u)/2,f=(i+a)/2;(e=s[3])&&c.push(new r.default(e,l,f,u,a)),(e=s[2])&&c.push(new r.default(e,o,f,l,a)),(e=s[1])&&c.push(new r.default(e,l,i,u,f)),(e=s[0])&&c.push(new r.default(e,o,i,l,f));}return this};},"./node_modules/d3-quadtree/src/visitAfter.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-quadtree/src/quad.js");n.default=function(t){var n,e=[],o=[];for(this._root&&e.push(new r.default(this._root,this._x0,this._y0,this._x1,this._y1));n=e.pop();){var i=n.node;if(i.length){var u,a=n.x0,c=n.y0,s=n.x1,l=n.y1,f=(a+s)/2,h=(c+l)/2;(u=i[0])&&e.push(new r.default(u,a,c,f,h)),(u=i[1])&&e.push(new r.default(u,f,c,s,h)),(u=i[2])&&e.push(new r.default(u,a,h,f,l)),(u=i[3])&&e.push(new r.default(u,f,h,s,l));}o.push(n);}for(;n=o.pop();)t(n.node,n.x0,n.y0,n.x1,n.y1);return this};},"./node_modules/d3-quadtree/src/x.js":function(t,n,e){function r(t){return t[0]}e.r(n),e.d(n,"defaultX",function(){return r}),n.default=function(t){return arguments.length?(this._x=t,this):this._x};},"./node_modules/d3-quadtree/src/y.js":function(t,n,e){function r(t){return t[1]}e.r(n),e.d(n,"defaultY",function(){return r}),n.default=function(t){return arguments.length?(this._y=t,this):this._y};},"./node_modules/d3-timer/src/index.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-timer/src/timer.js");e.d(n,"now",function(){return r.now}),e.d(n,"timer",function(){return r.timer}),e.d(n,"timerFlush",function(){return r.timerFlush});var o=e("./node_modules/d3-timer/src/timeout.js");e.d(n,"timeout",function(){return o.default});var i=e("./node_modules/d3-timer/src/interval.js");e.d(n,"interval",function(){return i.default});},"./node_modules/d3-timer/src/interval.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-timer/src/timer.js");n.default=function(t,n,e){var o=new r.Timer,i=n;return null==n?(o.restart(t,n,e),o):(n=+n,e=null==e?Object(r.now)():+e,o.restart(function r(u){u+=i,o.restart(r,i+=n,e),t(u);},n,e),o)};},"./node_modules/d3-timer/src/timeout.js":function(t,n,e){e.r(n);var r=e("./node_modules/d3-timer/src/timer.js");n.default=function(t,n,e){var o=new r.Timer;return n=null==n?0:+n,o.restart(function(e){o.stop(),t(e+n);},n,e),o};},"./node_modules/d3-timer/src/timer.js":function(t,n,e){e.r(n),e.d(n,"now",function(){return p}),e.d(n,"Timer",function(){return v}),e.d(n,"timer",function(){return m}),e.d(n,"timerFlush",function(){return x});var r,o,i=0,u=0,a=0,c=1e3,s=0,l=0,f=0,h="object"==typeof performance&&performance.now?performance:Date,d="object"==typeof window&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(t){setTimeout(t,17);};function p(){return l||(d(g),l=h.now()+f)}function g(){l=0;}function v(){this._call=this._time=this._next=null;}function m(t,n,e){var r=new v;return r.restart(t,n,e),r}function x(){p(),++i;for(var t,n=r;n;)(t=l-n._time)>=0&&n._call.call(null,t),n=n._next;--i;}function _(){l=(s=h.now())+f,i=u=0;try{x();}finally{i=0,function(){var t,n,e=r,i=1/0;for(;e;)e._call?(i>e._time&&(i=e._time),t=e,e=e._next):(n=e._next,e._next=null,e=t?t._next=n:r=n);o=t,b(i);}(),l=0;}}function y(){var t=h.now(),n=t-s;n>c&&(f-=n,s=t);}function b(t){i||(u&&(u=clearTimeout(u)),t-l>24?(t<1/0&&(u=setTimeout(_,t-h.now()-f)),a&&(a=clearInterval(a))):(a||(s=h.now(),a=setInterval(y,c)),i=1,d(_)));}v.prototype=m.prototype={constructor:v,restart:function(t,n,e){if("function"!=typeof t)throw new TypeError("callback is not a function");e=(null==e?p():+e)+(null==n?0:+n),this._next||o===this||(o?o._next=this:r=this,o=this),this._call=t,this._time=e,b();},stop:function(){this._call&&(this._call=null,this._time=1/0,b());}};},"./node_modules/gl-matrix/lib/gl-matrix.js":function(t,n,e){e.r(n);var r=e("./node_modules/gl-matrix/lib/gl-matrix/common.js");e.d(n,"glMatrix",function(){return r});var o=e("./node_modules/gl-matrix/lib/gl-matrix/mat2.js");e.d(n,"mat2",function(){return o});var i=e("./node_modules/gl-matrix/lib/gl-matrix/mat2d.js");e.d(n,"mat2d",function(){return i});var u=e("./node_modules/gl-matrix/lib/gl-matrix/mat3.js");e.d(n,"mat3",function(){return u});var a=e("./node_modules/gl-matrix/lib/gl-matrix/mat4.js");e.d(n,"mat4",function(){return a});var c=e("./node_modules/gl-matrix/lib/gl-matrix/quat.js");e.d(n,"quat",function(){return c});var s=e("./node_modules/gl-matrix/lib/gl-matrix/quat2.js");e.d(n,"quat2",function(){return s});var l=e("./node_modules/gl-matrix/lib/gl-matrix/vec2.js");e.d(n,"vec2",function(){return l});var f=e("./node_modules/gl-matrix/lib/gl-matrix/vec3.js");e.d(n,"vec3",function(){return f});var h=e("./node_modules/gl-matrix/lib/gl-matrix/vec4.js");e.d(n,"vec4",function(){return h});},"./node_modules/gl-matrix/lib/gl-matrix/common.js":function(t,n,e){e.r(n),e.d(n,"EPSILON",function(){return r}),e.d(n,"ARRAY_TYPE",function(){return o}),e.d(n,"RANDOM",function(){return i}),e.d(n,"setMatrixArrayType",function(){return u}),e.d(n,"toRadian",function(){return c}),e.d(n,"equals",function(){return s});var r=1e-6,o="undefined"!=typeof Float32Array?Float32Array:Array,i=Math.random;function u(t){o=t;}var a=Math.PI/180;function c(t){return t*a}function s(t,n){return Math.abs(t-n)<=r*Math.max(1,Math.abs(t),Math.abs(n))}},"./node_modules/gl-matrix/lib/gl-matrix/mat2.js":function(t,n,e){e.r(n),e.d(n,"create",function(){return o}),e.d(n,"clone",function(){return i}),e.d(n,"copy",function(){return u}),e.d(n,"identity",function(){return a}),e.d(n,"fromValues",function(){return c}),e.d(n,"set",function(){return s}),e.d(n,"transpose",function(){return l}),e.d(n,"invert",function(){return f}),e.d(n,"adjoint",function(){return h}),e.d(n,"determinant",function(){return d}),e.d(n,"multiply",function(){return p}),e.d(n,"rotate",function(){return g}),e.d(n,"scale",function(){return v}),e.d(n,"fromRotation",function(){return m}),e.d(n,"fromScaling",function(){return x}),e.d(n,"str",function(){return _}),e.d(n,"frob",function(){return y}),e.d(n,"LDU",function(){return b}),e.d(n,"add",function(){return w}),e.d(n,"subtract",function(){return M}),e.d(n,"exactEquals",function(){return A}),e.d(n,"equals",function(){return j}),e.d(n,"multiplyScalar",function(){return E}),e.d(n,"multiplyScalarAndAdd",function(){return I}),e.d(n,"mul",function(){return P}),e.d(n,"sub",function(){return S});var r=e("./node_modules/gl-matrix/lib/gl-matrix/common.js");function o(){var t=new r.ARRAY_TYPE(4);return r.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0),t[0]=1,t[3]=1,t}function i(t){var n=new r.ARRAY_TYPE(4);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n}function u(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t}function a(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t}function c(t,n,e,o){var i=new r.ARRAY_TYPE(4);return i[0]=t,i[1]=n,i[2]=e,i[3]=o,i}function s(t,n,e,r,o){return t[0]=n,t[1]=e,t[2]=r,t[3]=o,t}function l(t,n){if(t===n){var e=n[1];t[1]=n[2],t[2]=e;}else t[0]=n[0],t[1]=n[2],t[2]=n[1],t[3]=n[3];return t}function f(t,n){var e=n[0],r=n[1],o=n[2],i=n[3],u=e*i-o*r;return u?(u=1/u,t[0]=i*u,t[1]=-r*u,t[2]=-o*u,t[3]=e*u,t):null}function h(t,n){var e=n[0];return t[0]=n[3],t[1]=-n[1],t[2]=-n[2],t[3]=e,t}function d(t){return t[0]*t[3]-t[2]*t[1]}function p(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=e[0],c=e[1],s=e[2],l=e[3];return t[0]=r*a+i*c,t[1]=o*a+u*c,t[2]=r*s+i*l,t[3]=o*s+u*l,t}function g(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=Math.sin(e),c=Math.cos(e);return t[0]=r*c+i*a,t[1]=o*c+u*a,t[2]=r*-a+i*c,t[3]=o*-a+u*c,t}function v(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=e[0],c=e[1];return t[0]=r*a,t[1]=o*a,t[2]=i*c,t[3]=u*c,t}function m(t,n){var e=Math.sin(n),r=Math.cos(n);return t[0]=r,t[1]=e,t[2]=-e,t[3]=r,t}function x(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=n[1],t}function _(t){return "mat2("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"}function y(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2))}function b(t,n,e,r){return t[2]=r[2]/r[0],e[0]=r[0],e[1]=r[1],e[3]=r[3]-t[2]*e[1],[t,n,e]}function w(t,n,e){return t[0]=n[0]+e[0],t[1]=n[1]+e[1],t[2]=n[2]+e[2],t[3]=n[3]+e[3],t}function M(t,n,e){return t[0]=n[0]-e[0],t[1]=n[1]-e[1],t[2]=n[2]-e[2],t[3]=n[3]-e[3],t}function A(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]}function j(t,n){var e=t[0],o=t[1],i=t[2],u=t[3],a=n[0],c=n[1],s=n[2],l=n[3];return Math.abs(e-a)<=r.EPSILON*Math.max(1,Math.abs(e),Math.abs(a))&&Math.abs(o-c)<=r.EPSILON*Math.max(1,Math.abs(o),Math.abs(c))&&Math.abs(i-s)<=r.EPSILON*Math.max(1,Math.abs(i),Math.abs(s))&&Math.abs(u-l)<=r.EPSILON*Math.max(1,Math.abs(u),Math.abs(l))}function E(t,n,e){return t[0]=n[0]*e,t[1]=n[1]*e,t[2]=n[2]*e,t[3]=n[3]*e,t}function I(t,n,e,r){return t[0]=n[0]+e[0]*r,t[1]=n[1]+e[1]*r,t[2]=n[2]+e[2]*r,t[3]=n[3]+e[3]*r,t}var P=p,S=M;},"./node_modules/gl-matrix/lib/gl-matrix/mat2d.js":function(t,n,e){e.r(n),e.d(n,"create",function(){return o}),e.d(n,"clone",function(){return i}),e.d(n,"copy",function(){return u}),e.d(n,"identity",function(){return a}),e.d(n,"fromValues",function(){return c}),e.d(n,"set",function(){return s}),e.d(n,"invert",function(){return l}),e.d(n,"determinant",function(){return f}),e.d(n,"multiply",function(){return h}),e.d(n,"rotate",function(){return d}),e.d(n,"scale",function(){return p}),e.d(n,"translate",function(){return g}),e.d(n,"fromRotation",function(){return v}),e.d(n,"fromScaling",function(){return m}),e.d(n,"fromTranslation",function(){return x}),e.d(n,"str",function(){return _}),e.d(n,"frob",function(){return y}),e.d(n,"add",function(){return b}),e.d(n,"subtract",function(){return w}),e.d(n,"multiplyScalar",function(){return M}),e.d(n,"multiplyScalarAndAdd",function(){return A}),e.d(n,"exactEquals",function(){return j}),e.d(n,"equals",function(){return E}),e.d(n,"mul",function(){return I}),e.d(n,"sub",function(){return P});var r=e("./node_modules/gl-matrix/lib/gl-matrix/common.js");function o(){var t=new r.ARRAY_TYPE(6);return r.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0,t[4]=0,t[5]=0),t[0]=1,t[3]=1,t}function i(t){var n=new r.ARRAY_TYPE(6);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n}function u(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t}function a(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t[4]=0,t[5]=0,t}function c(t,n,e,o,i,u){var a=new r.ARRAY_TYPE(6);return a[0]=t,a[1]=n,a[2]=e,a[3]=o,a[4]=i,a[5]=u,a}function s(t,n,e,r,o,i,u){return t[0]=n,t[1]=e,t[2]=r,t[3]=o,t[4]=i,t[5]=u,t}function l(t,n){var e=n[0],r=n[1],o=n[2],i=n[3],u=n[4],a=n[5],c=e*i-r*o;return c?(c=1/c,t[0]=i*c,t[1]=-r*c,t[2]=-o*c,t[3]=e*c,t[4]=(o*a-i*u)*c,t[5]=(r*u-e*a)*c,t):null}function f(t){return t[0]*t[3]-t[1]*t[2]}function h(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=n[4],c=n[5],s=e[0],l=e[1],f=e[2],h=e[3],d=e[4],p=e[5];return t[0]=r*s+i*l,t[1]=o*s+u*l,t[2]=r*f+i*h,t[3]=o*f+u*h,t[4]=r*d+i*p+a,t[5]=o*d+u*p+c,t}function d(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=n[4],c=n[5],s=Math.sin(e),l=Math.cos(e);return t[0]=r*l+i*s,t[1]=o*l+u*s,t[2]=r*-s+i*l,t[3]=o*-s+u*l,t[4]=a,t[5]=c,t}function p(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=n[4],c=n[5],s=e[0],l=e[1];return t[0]=r*s,t[1]=o*s,t[2]=i*l,t[3]=u*l,t[4]=a,t[5]=c,t}function g(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=n[4],c=n[5],s=e[0],l=e[1];return t[0]=r,t[1]=o,t[2]=i,t[3]=u,t[4]=r*s+i*l+a,t[5]=o*s+u*l+c,t}function v(t,n){var e=Math.sin(n),r=Math.cos(n);return t[0]=r,t[1]=e,t[2]=-e,t[3]=r,t[4]=0,t[5]=0,t}function m(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=n[1],t[4]=0,t[5]=0,t}function x(t,n){return t[0]=1,t[1]=0,t[2]=0,t[3]=1,t[4]=n[0],t[5]=n[1],t}function _(t){return "mat2d("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+")"}function y(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+1)}function b(t,n,e){return t[0]=n[0]+e[0],t[1]=n[1]+e[1],t[2]=n[2]+e[2],t[3]=n[3]+e[3],t[4]=n[4]+e[4],t[5]=n[5]+e[5],t}function w(t,n,e){return t[0]=n[0]-e[0],t[1]=n[1]-e[1],t[2]=n[2]-e[2],t[3]=n[3]-e[3],t[4]=n[4]-e[4],t[5]=n[5]-e[5],t}function M(t,n,e){return t[0]=n[0]*e,t[1]=n[1]*e,t[2]=n[2]*e,t[3]=n[3]*e,t[4]=n[4]*e,t[5]=n[5]*e,t}function A(t,n,e,r){return t[0]=n[0]+e[0]*r,t[1]=n[1]+e[1]*r,t[2]=n[2]+e[2]*r,t[3]=n[3]+e[3]*r,t[4]=n[4]+e[4]*r,t[5]=n[5]+e[5]*r,t}function j(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]}function E(t,n){var e=t[0],o=t[1],i=t[2],u=t[3],a=t[4],c=t[5],s=n[0],l=n[1],f=n[2],h=n[3],d=n[4],p=n[5];return Math.abs(e-s)<=r.EPSILON*Math.max(1,Math.abs(e),Math.abs(s))&&Math.abs(o-l)<=r.EPSILON*Math.max(1,Math.abs(o),Math.abs(l))&&Math.abs(i-f)<=r.EPSILON*Math.max(1,Math.abs(i),Math.abs(f))&&Math.abs(u-h)<=r.EPSILON*Math.max(1,Math.abs(u),Math.abs(h))&&Math.abs(a-d)<=r.EPSILON*Math.max(1,Math.abs(a),Math.abs(d))&&Math.abs(c-p)<=r.EPSILON*Math.max(1,Math.abs(c),Math.abs(p))}var I=h,P=w;},"./node_modules/gl-matrix/lib/gl-matrix/mat3.js":function(t,n,e){e.r(n),e.d(n,"create",function(){return o}),e.d(n,"fromMat4",function(){return i}),e.d(n,"clone",function(){return u}),e.d(n,"copy",function(){return a}),e.d(n,"fromValues",function(){return c}),e.d(n,"set",function(){return s}),e.d(n,"identity",function(){return l}),e.d(n,"transpose",function(){return f}),e.d(n,"invert",function(){return h}),e.d(n,"adjoint",function(){return d}),e.d(n,"determinant",function(){return p}),e.d(n,"multiply",function(){return g}),e.d(n,"translate",function(){return v}),e.d(n,"rotate",function(){return m}),e.d(n,"scale",function(){return x}),e.d(n,"fromTranslation",function(){return _}),e.d(n,"fromRotation",function(){return y}),e.d(n,"fromScaling",function(){return b}),e.d(n,"fromMat2d",function(){return w}),e.d(n,"fromQuat",function(){return M}),e.d(n,"normalFromMat4",function(){return A}),e.d(n,"projection",function(){return j}),e.d(n,"str",function(){return E}),e.d(n,"frob",function(){return I}),e.d(n,"add",function(){return P}),e.d(n,"subtract",function(){return S}),e.d(n,"multiplyScalar",function(){return T}),e.d(n,"multiplyScalarAndAdd",function(){return O}),e.d(n,"exactEquals",function(){return z}),e.d(n,"equals",function(){return L}),e.d(n,"mul",function(){return N}),e.d(n,"sub",function(){return C});var r=e("./node_modules/gl-matrix/lib/gl-matrix/common.js");function o(){var t=new r.ARRAY_TYPE(9);return r.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0,t[3]=0,t[5]=0,t[6]=0,t[7]=0),t[0]=1,t[4]=1,t[8]=1,t}function i(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[4],t[4]=n[5],t[5]=n[6],t[6]=n[8],t[7]=n[9],t[8]=n[10],t}function u(t){var n=new r.ARRAY_TYPE(9);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n[6]=t[6],n[7]=t[7],n[8]=t[8],n}function a(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t}function c(t,n,e,o,i,u,a,c,s){var l=new r.ARRAY_TYPE(9);return l[0]=t,l[1]=n,l[2]=e,l[3]=o,l[4]=i,l[5]=u,l[6]=a,l[7]=c,l[8]=s,l}function s(t,n,e,r,o,i,u,a,c,s){return t[0]=n,t[1]=e,t[2]=r,t[3]=o,t[4]=i,t[5]=u,t[6]=a,t[7]=c,t[8]=s,t}function l(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t}function f(t,n){if(t===n){var e=n[1],r=n[2],o=n[5];t[1]=n[3],t[2]=n[6],t[3]=e,t[5]=n[7],t[6]=r,t[7]=o;}else t[0]=n[0],t[1]=n[3],t[2]=n[6],t[3]=n[1],t[4]=n[4],t[5]=n[7],t[6]=n[2],t[7]=n[5],t[8]=n[8];return t}function h(t,n){var e=n[0],r=n[1],o=n[2],i=n[3],u=n[4],a=n[5],c=n[6],s=n[7],l=n[8],f=l*u-a*s,h=-l*i+a*c,d=s*i-u*c,p=e*f+r*h+o*d;return p?(p=1/p,t[0]=f*p,t[1]=(-l*r+o*s)*p,t[2]=(a*r-o*u)*p,t[3]=h*p,t[4]=(l*e-o*c)*p,t[5]=(-a*e+o*i)*p,t[6]=d*p,t[7]=(-s*e+r*c)*p,t[8]=(u*e-r*i)*p,t):null}function d(t,n){var e=n[0],r=n[1],o=n[2],i=n[3],u=n[4],a=n[5],c=n[6],s=n[7],l=n[8];return t[0]=u*l-a*s,t[1]=o*s-r*l,t[2]=r*a-o*u,t[3]=a*c-i*l,t[4]=e*l-o*c,t[5]=o*i-e*a,t[6]=i*s-u*c,t[7]=r*c-e*s,t[8]=e*u-r*i,t}function p(t){var n=t[0],e=t[1],r=t[2],o=t[3],i=t[4],u=t[5],a=t[6],c=t[7],s=t[8];return n*(s*i-u*c)+e*(-s*o+u*a)+r*(c*o-i*a)}function g(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=n[4],c=n[5],s=n[6],l=n[7],f=n[8],h=e[0],d=e[1],p=e[2],g=e[3],v=e[4],m=e[5],x=e[6],_=e[7],y=e[8];return t[0]=h*r+d*u+p*s,t[1]=h*o+d*a+p*l,t[2]=h*i+d*c+p*f,t[3]=g*r+v*u+m*s,t[4]=g*o+v*a+m*l,t[5]=g*i+v*c+m*f,t[6]=x*r+_*u+y*s,t[7]=x*o+_*a+y*l,t[8]=x*i+_*c+y*f,t}function v(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=n[4],c=n[5],s=n[6],l=n[7],f=n[8],h=e[0],d=e[1];return t[0]=r,t[1]=o,t[2]=i,t[3]=u,t[4]=a,t[5]=c,t[6]=h*r+d*u+s,t[7]=h*o+d*a+l,t[8]=h*i+d*c+f,t}function m(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=n[4],c=n[5],s=n[6],l=n[7],f=n[8],h=Math.sin(e),d=Math.cos(e);return t[0]=d*r+h*u,t[1]=d*o+h*a,t[2]=d*i+h*c,t[3]=d*u-h*r,t[4]=d*a-h*o,t[5]=d*c-h*i,t[6]=s,t[7]=l,t[8]=f,t}function x(t,n,e){var r=e[0],o=e[1];return t[0]=r*n[0],t[1]=r*n[1],t[2]=r*n[2],t[3]=o*n[3],t[4]=o*n[4],t[5]=o*n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t}function _(t,n){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=1,t[5]=0,t[6]=n[0],t[7]=n[1],t[8]=1,t}function y(t,n){var e=Math.sin(n),r=Math.cos(n);return t[0]=r,t[1]=e,t[2]=0,t[3]=-e,t[4]=r,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t}function b(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=0,t[4]=n[1],t[5]=0,t[6]=0,t[7]=0,t[8]=1,t}function w(t,n){return t[0]=n[0],t[1]=n[1],t[2]=0,t[3]=n[2],t[4]=n[3],t[5]=0,t[6]=n[4],t[7]=n[5],t[8]=1,t}function M(t,n){var e=n[0],r=n[1],o=n[2],i=n[3],u=e+e,a=r+r,c=o+o,s=e*u,l=r*u,f=r*a,h=o*u,d=o*a,p=o*c,g=i*u,v=i*a,m=i*c;return t[0]=1-f-p,t[3]=l-m,t[6]=h+v,t[1]=l+m,t[4]=1-s-p,t[7]=d-g,t[2]=h-v,t[5]=d+g,t[8]=1-s-f,t}function A(t,n){var e=n[0],r=n[1],o=n[2],i=n[3],u=n[4],a=n[5],c=n[6],s=n[7],l=n[8],f=n[9],h=n[10],d=n[11],p=n[12],g=n[13],v=n[14],m=n[15],x=e*a-r*u,_=e*c-o*u,y=e*s-i*u,b=r*c-o*a,w=r*s-i*a,M=o*s-i*c,A=l*g-f*p,j=l*v-h*p,E=l*m-d*p,I=f*v-h*g,P=f*m-d*g,S=h*m-d*v,T=x*S-_*P+y*I+b*E-w*j+M*A;return T?(T=1/T,t[0]=(a*S-c*P+s*I)*T,t[1]=(c*E-u*S-s*j)*T,t[2]=(u*P-a*E+s*A)*T,t[3]=(o*P-r*S-i*I)*T,t[4]=(e*S-o*E+i*j)*T,t[5]=(r*E-e*P-i*A)*T,t[6]=(g*M-v*w+m*b)*T,t[7]=(v*y-p*M-m*_)*T,t[8]=(p*w-g*y+m*x)*T,t):null}function j(t,n,e){return t[0]=2/n,t[1]=0,t[2]=0,t[3]=0,t[4]=-2/e,t[5]=0,t[6]=-1,t[7]=1,t[8]=1,t}function E(t){return "mat3("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+", "+t[8]+")"}function I(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+Math.pow(t[6],2)+Math.pow(t[7],2)+Math.pow(t[8],2))}function P(t,n,e){return t[0]=n[0]+e[0],t[1]=n[1]+e[1],t[2]=n[2]+e[2],t[3]=n[3]+e[3],t[4]=n[4]+e[4],t[5]=n[5]+e[5],t[6]=n[6]+e[6],t[7]=n[7]+e[7],t[8]=n[8]+e[8],t}function S(t,n,e){return t[0]=n[0]-e[0],t[1]=n[1]-e[1],t[2]=n[2]-e[2],t[3]=n[3]-e[3],t[4]=n[4]-e[4],t[5]=n[5]-e[5],t[6]=n[6]-e[6],t[7]=n[7]-e[7],t[8]=n[8]-e[8],t}function T(t,n,e){return t[0]=n[0]*e,t[1]=n[1]*e,t[2]=n[2]*e,t[3]=n[3]*e,t[4]=n[4]*e,t[5]=n[5]*e,t[6]=n[6]*e,t[7]=n[7]*e,t[8]=n[8]*e,t}function O(t,n,e,r){return t[0]=n[0]+e[0]*r,t[1]=n[1]+e[1]*r,t[2]=n[2]+e[2]*r,t[3]=n[3]+e[3]*r,t[4]=n[4]+e[4]*r,t[5]=n[5]+e[5]*r,t[6]=n[6]+e[6]*r,t[7]=n[7]+e[7]*r,t[8]=n[8]+e[8]*r,t}function z(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]&&t[6]===n[6]&&t[7]===n[7]&&t[8]===n[8]}function L(t,n){var e=t[0],o=t[1],i=t[2],u=t[3],a=t[4],c=t[5],s=t[6],l=t[7],f=t[8],h=n[0],d=n[1],p=n[2],g=n[3],v=n[4],m=n[5],x=n[6],_=n[7],y=n[8];return Math.abs(e-h)<=r.EPSILON*Math.max(1,Math.abs(e),Math.abs(h))&&Math.abs(o-d)<=r.EPSILON*Math.max(1,Math.abs(o),Math.abs(d))&&Math.abs(i-p)<=r.EPSILON*Math.max(1,Math.abs(i),Math.abs(p))&&Math.abs(u-g)<=r.EPSILON*Math.max(1,Math.abs(u),Math.abs(g))&&Math.abs(a-v)<=r.EPSILON*Math.max(1,Math.abs(a),Math.abs(v))&&Math.abs(c-m)<=r.EPSILON*Math.max(1,Math.abs(c),Math.abs(m))&&Math.abs(s-x)<=r.EPSILON*Math.max(1,Math.abs(s),Math.abs(x))&&Math.abs(l-_)<=r.EPSILON*Math.max(1,Math.abs(l),Math.abs(_))&&Math.abs(f-y)<=r.EPSILON*Math.max(1,Math.abs(f),Math.abs(y))}var N=g,C=S;},"./node_modules/gl-matrix/lib/gl-matrix/mat4.js":function(t,n,e){e.r(n),e.d(n,"create",function(){return o}),e.d(n,"clone",function(){return i}),e.d(n,"copy",function(){return u}),e.d(n,"fromValues",function(){return a}),e.d(n,"set",function(){return c}),e.d(n,"identity",function(){return s}),e.d(n,"transpose",function(){return l}),e.d(n,"invert",function(){return f}),e.d(n,"adjoint",function(){return h}),e.d(n,"determinant",function(){return d}),e.d(n,"multiply",function(){return p}),e.d(n,"translate",function(){return g}),e.d(n,"scale",function(){return v}),e.d(n,"rotate",function(){return m}),e.d(n,"rotateX",function(){return x}),e.d(n,"rotateY",function(){return _}),e.d(n,"rotateZ",function(){return y}),e.d(n,"fromTranslation",function(){return b}),e.d(n,"fromScaling",function(){return w}),e.d(n,"fromRotation",function(){return M}),e.d(n,"fromXRotation",function(){return A}),e.d(n,"fromYRotation",function(){return j}),e.d(n,"fromZRotation",function(){return E}),e.d(n,"fromRotationTranslation",function(){return I}),e.d(n,"fromQuat2",function(){return P}),e.d(n,"getTranslation",function(){return S}),e.d(n,"getScaling",function(){return T}),e.d(n,"getRotation",function(){return O}),e.d(n,"fromRotationTranslationScale",function(){return z}),e.d(n,"fromRotationTranslationScaleOrigin",function(){return L}),e.d(n,"fromQuat",function(){return N}),e.d(n,"frustum",function(){return C}),e.d(n,"perspective",function(){return R}),e.d(n,"perspectiveFromFieldOfView",function(){return k}),e.d(n,"ortho",function(){return D}),e.d(n,"lookAt",function(){return V}),e.d(n,"targetTo",function(){return B}),e.d(n,"str",function(){return q}),e.d(n,"frob",function(){return Y}),e.d(n,"add",function(){return U}),e.d(n,"subtract",function(){return F}),e.d(n,"multiplyScalar",function(){return X}),e.d(n,"multiplyScalarAndAdd",function(){return G}),e.d(n,"exactEquals",function(){return Z}),e.d(n,"equals",function(){return W}),e.d(n,"mul",function(){return H}),e.d(n,"sub",function(){return $});var r=e("./node_modules/gl-matrix/lib/gl-matrix/common.js");function o(){var t=new r.ARRAY_TYPE(16);return r.ARRAY_TYPE!=Float32Array&&(t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0),t[0]=1,t[5]=1,t[10]=1,t[15]=1,t}function i(t){var n=new r.ARRAY_TYPE(16);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n[6]=t[6],n[7]=t[7],n[8]=t[8],n[9]=t[9],n[10]=t[10],n[11]=t[11],n[12]=t[12],n[13]=t[13],n[14]=t[14],n[15]=t[15],n}function u(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],t}function a(t,n,e,o,i,u,a,c,s,l,f,h,d,p,g,v){var m=new r.ARRAY_TYPE(16);return m[0]=t,m[1]=n,m[2]=e,m[3]=o,m[4]=i,m[5]=u,m[6]=a,m[7]=c,m[8]=s,m[9]=l,m[10]=f,m[11]=h,m[12]=d,m[13]=p,m[14]=g,m[15]=v,m}function c(t,n,e,r,o,i,u,a,c,s,l,f,h,d,p,g,v){return t[0]=n,t[1]=e,t[2]=r,t[3]=o,t[4]=i,t[5]=u,t[6]=a,t[7]=c,t[8]=s,t[9]=l,t[10]=f,t[11]=h,t[12]=d,t[13]=p,t[14]=g,t[15]=v,t}function s(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function l(t,n){if(t===n){var e=n[1],r=n[2],o=n[3],i=n[6],u=n[7],a=n[11];t[1]=n[4],t[2]=n[8],t[3]=n[12],t[4]=e,t[6]=n[9],t[7]=n[13],t[8]=r,t[9]=i,t[11]=n[14],t[12]=o,t[13]=u,t[14]=a;}else t[0]=n[0],t[1]=n[4],t[2]=n[8],t[3]=n[12],t[4]=n[1],t[5]=n[5],t[6]=n[9],t[7]=n[13],t[8]=n[2],t[9]=n[6],t[10]=n[10],t[11]=n[14],t[12]=n[3],t[13]=n[7],t[14]=n[11],t[15]=n[15];return t}function f(t,n){var e=n[0],r=n[1],o=n[2],i=n[3],u=n[4],a=n[5],c=n[6],s=n[7],l=n[8],f=n[9],h=n[10],d=n[11],p=n[12],g=n[13],v=n[14],m=n[15],x=e*a-r*u,_=e*c-o*u,y=e*s-i*u,b=r*c-o*a,w=r*s-i*a,M=o*s-i*c,A=l*g-f*p,j=l*v-h*p,E=l*m-d*p,I=f*v-h*g,P=f*m-d*g,S=h*m-d*v,T=x*S-_*P+y*I+b*E-w*j+M*A;return T?(T=1/T,t[0]=(a*S-c*P+s*I)*T,t[1]=(o*P-r*S-i*I)*T,t[2]=(g*M-v*w+m*b)*T,t[3]=(h*w-f*M-d*b)*T,t[4]=(c*E-u*S-s*j)*T,t[5]=(e*S-o*E+i*j)*T,t[6]=(v*y-p*M-m*_)*T,t[7]=(l*M-h*y+d*_)*T,t[8]=(u*P-a*E+s*A)*T,t[9]=(r*E-e*P-i*A)*T,t[10]=(p*w-g*y+m*x)*T,t[11]=(f*y-l*w-d*x)*T,t[12]=(a*j-u*I-c*A)*T,t[13]=(e*I-r*j+o*A)*T,t[14]=(g*_-p*b-v*x)*T,t[15]=(l*b-f*_+h*x)*T,t):null}function h(t,n){var e=n[0],r=n[1],o=n[2],i=n[3],u=n[4],a=n[5],c=n[6],s=n[7],l=n[8],f=n[9],h=n[10],d=n[11],p=n[12],g=n[13],v=n[14],m=n[15];return t[0]=a*(h*m-d*v)-f*(c*m-s*v)+g*(c*d-s*h),t[1]=-(r*(h*m-d*v)-f*(o*m-i*v)+g*(o*d-i*h)),t[2]=r*(c*m-s*v)-a*(o*m-i*v)+g*(o*s-i*c),t[3]=-(r*(c*d-s*h)-a*(o*d-i*h)+f*(o*s-i*c)),t[4]=-(u*(h*m-d*v)-l*(c*m-s*v)+p*(c*d-s*h)),t[5]=e*(h*m-d*v)-l*(o*m-i*v)+p*(o*d-i*h),t[6]=-(e*(c*m-s*v)-u*(o*m-i*v)+p*(o*s-i*c)),t[7]=e*(c*d-s*h)-u*(o*d-i*h)+l*(o*s-i*c),t[8]=u*(f*m-d*g)-l*(a*m-s*g)+p*(a*d-s*f),t[9]=-(e*(f*m-d*g)-l*(r*m-i*g)+p*(r*d-i*f)),t[10]=e*(a*m-s*g)-u*(r*m-i*g)+p*(r*s-i*a),t[11]=-(e*(a*d-s*f)-u*(r*d-i*f)+l*(r*s-i*a)),t[12]=-(u*(f*v-h*g)-l*(a*v-c*g)+p*(a*h-c*f)),t[13]=e*(f*v-h*g)-l*(r*v-o*g)+p*(r*h-o*f),t[14]=-(e*(a*v-c*g)-u*(r*v-o*g)+p*(r*c-o*a)),t[15]=e*(a*h-c*f)-u*(r*h-o*f)+l*(r*c-o*a),t}function d(t){var n=t[0],e=t[1],r=t[2],o=t[3],i=t[4],u=t[5],a=t[6],c=t[7],s=t[8],l=t[9],f=t[10],h=t[11],d=t[12],p=t[13],g=t[14],v=t[15];return (n*u-e*i)*(f*v-h*g)-(n*a-r*i)*(l*v-h*p)+(n*c-o*i)*(l*g-f*p)+(e*a-r*u)*(s*v-h*d)-(e*c-o*u)*(s*g-f*d)+(r*c-o*a)*(s*p-l*d)}function p(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=n[4],c=n[5],s=n[6],l=n[7],f=n[8],h=n[9],d=n[10],p=n[11],g=n[12],v=n[13],m=n[14],x=n[15],_=e[0],y=e[1],b=e[2],w=e[3];return t[0]=_*r+y*a+b*f+w*g,t[1]=_*o+y*c+b*h+w*v,t[2]=_*i+y*s+b*d+w*m,t[3]=_*u+y*l+b*p+w*x,_=e[4],y=e[5],b=e[6],w=e[7],t[4]=_*r+y*a+b*f+w*g,t[5]=_*o+y*c+b*h+w*v,t[6]=_*i+y*s+b*d+w*m,t[7]=_*u+y*l+b*p+w*x,_=e[8],y=e[9],b=e[10],w=e[11],t[8]=_*r+y*a+b*f+w*g,t[9]=_*o+y*c+b*h+w*v,t[10]=_*i+y*s+b*d+w*m,t[11]=_*u+y*l+b*p+w*x,_=e[12],y=e[13],b=e[14],w=e[15],t[12]=_*r+y*a+b*f+w*g,t[13]=_*o+y*c+b*h+w*v,t[14]=_*i+y*s+b*d+w*m,t[15]=_*u+y*l+b*p+w*x,t}function g(t,n,e){var r=e[0],o=e[1],i=e[2],u=void 0,a=void 0,c=void 0,s=void 0,l=void 0,f=void 0,h=void 0,d=void 0,p=void 0,g=void 0,v=void 0,m=void 0;return n===t?(t[12]=n[0]*r+n[4]*o+n[8]*i+n[12],t[13]=n[1]*r+n[5]*o+n[9]*i+n[13],t[14]=n[2]*r+n[6]*o+n[10]*i+n[14],t[15]=n[3]*r+n[7]*o+n[11]*i+n[15]):(u=n[0],a=n[1],c=n[2],s=n[3],l=n[4],f=n[5],h=n[6],d=n[7],p=n[8],g=n[9],v=n[10],m=n[11],t[0]=u,t[1]=a,t[2]=c,t[3]=s,t[4]=l,t[5]=f,t[6]=h,t[7]=d,t[8]=p,t[9]=g,t[10]=v,t[11]=m,t[12]=u*r+l*o+p*i+n[12],t[13]=a*r+f*o+g*i+n[13],t[14]=c*r+h*o+v*i+n[14],t[15]=s*r+d*o+m*i+n[15]),t}function v(t,n,e){var r=e[0],o=e[1],i=e[2];return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=n[3]*r,t[4]=n[4]*o,t[5]=n[5]*o,t[6]=n[6]*o,t[7]=n[7]*o,t[8]=n[8]*i,t[9]=n[9]*i,t[10]=n[10]*i,t[11]=n[11]*i,t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],t}function m(t,n,e,o){var i,u,a,c,s,l,f,h,d,p,g,v,m,x,_,y,b,w,M,A,j,E,I,P,S=o[0],T=o[1],O=o[2],z=Math.sqrt(S*S+T*T+O*O);return z<r.EPSILON?null:(S*=z=1/z,T*=z,O*=z,i=Math.sin(e),a=1-(u=Math.cos(e)),c=n[0],s=n[1],l=n[2],f=n[3],h=n[4],d=n[5],p=n[6],g=n[7],v=n[8],m=n[9],x=n[10],_=n[11],y=S*S*a+u,b=T*S*a+O*i,w=O*S*a-T*i,M=S*T*a-O*i,A=T*T*a+u,j=O*T*a+S*i,E=S*O*a+T*i,I=T*O*a-S*i,P=O*O*a+u,t[0]=c*y+h*b+v*w,t[1]=s*y+d*b+m*w,t[2]=l*y+p*b+x*w,t[3]=f*y+g*b+_*w,t[4]=c*M+h*A+v*j,t[5]=s*M+d*A+m*j,t[6]=l*M+p*A+x*j,t[7]=f*M+g*A+_*j,t[8]=c*E+h*I+v*P,t[9]=s*E+d*I+m*P,t[10]=l*E+p*I+x*P,t[11]=f*E+g*I+_*P,n!==t&&(t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]),t)}function x(t,n,e){var r=Math.sin(e),o=Math.cos(e),i=n[4],u=n[5],a=n[6],c=n[7],s=n[8],l=n[9],f=n[10],h=n[11];return n!==t&&(t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]),t[4]=i*o+s*r,t[5]=u*o+l*r,t[6]=a*o+f*r,t[7]=c*o+h*r,t[8]=s*o-i*r,t[9]=l*o-u*r,t[10]=f*o-a*r,t[11]=h*o-c*r,t}function _(t,n,e){var r=Math.sin(e),o=Math.cos(e),i=n[0],u=n[1],a=n[2],c=n[3],s=n[8],l=n[9],f=n[10],h=n[11];return n!==t&&(t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]),t[0]=i*o-s*r,t[1]=u*o-l*r,t[2]=a*o-f*r,t[3]=c*o-h*r,t[8]=i*r+s*o,t[9]=u*r+l*o,t[10]=a*r+f*o,t[11]=c*r+h*o,t}function y(t,n,e){var r=Math.sin(e),o=Math.cos(e),i=n[0],u=n[1],a=n[2],c=n[3],s=n[4],l=n[5],f=n[6],h=n[7];return n!==t&&(t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15]),t[0]=i*o+s*r,t[1]=u*o+l*r,t[2]=a*o+f*r,t[3]=c*o+h*r,t[4]=s*o-i*r,t[5]=l*o-u*r,t[6]=f*o-a*r,t[7]=h*o-c*r,t}function b(t,n){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=n[0],t[13]=n[1],t[14]=n[2],t[15]=1,t}function w(t,n){return t[0]=n[0],t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=n[1],t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=n[2],t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function M(t,n,e){var o,i,u,a=e[0],c=e[1],s=e[2],l=Math.sqrt(a*a+c*c+s*s);return l<r.EPSILON?null:(a*=l=1/l,c*=l,s*=l,o=Math.sin(n),u=1-(i=Math.cos(n)),t[0]=a*a*u+i,t[1]=c*a*u+s*o,t[2]=s*a*u-c*o,t[3]=0,t[4]=a*c*u-s*o,t[5]=c*c*u+i,t[6]=s*c*u+a*o,t[7]=0,t[8]=a*s*u+c*o,t[9]=c*s*u-a*o,t[10]=s*s*u+i,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t)}function A(t,n){var e=Math.sin(n),r=Math.cos(n);return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=r,t[6]=e,t[7]=0,t[8]=0,t[9]=-e,t[10]=r,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function j(t,n){var e=Math.sin(n),r=Math.cos(n);return t[0]=r,t[1]=0,t[2]=-e,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=e,t[9]=0,t[10]=r,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function E(t,n){var e=Math.sin(n),r=Math.cos(n);return t[0]=r,t[1]=e,t[2]=0,t[3]=0,t[4]=-e,t[5]=r,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function I(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=r+r,c=o+o,s=i+i,l=r*a,f=r*c,h=r*s,d=o*c,p=o*s,g=i*s,v=u*a,m=u*c,x=u*s;return t[0]=1-(d+g),t[1]=f+x,t[2]=h-m,t[3]=0,t[4]=f-x,t[5]=1-(l+g),t[6]=p+v,t[7]=0,t[8]=h+m,t[9]=p-v,t[10]=1-(l+d),t[11]=0,t[12]=e[0],t[13]=e[1],t[14]=e[2],t[15]=1,t}function P(t,n){var e=new r.ARRAY_TYPE(3),o=-n[0],i=-n[1],u=-n[2],a=n[3],c=n[4],s=n[5],l=n[6],f=n[7],h=o*o+i*i+u*u+a*a;return h>0?(e[0]=2*(c*a+f*o+s*u-l*i)/h,e[1]=2*(s*a+f*i+l*o-c*u)/h,e[2]=2*(l*a+f*u+c*i-s*o)/h):(e[0]=2*(c*a+f*o+s*u-l*i),e[1]=2*(s*a+f*i+l*o-c*u),e[2]=2*(l*a+f*u+c*i-s*o)),I(t,n,e),t}function S(t,n){return t[0]=n[12],t[1]=n[13],t[2]=n[14],t}function T(t,n){var e=n[0],r=n[1],o=n[2],i=n[4],u=n[5],a=n[6],c=n[8],s=n[9],l=n[10];return t[0]=Math.sqrt(e*e+r*r+o*o),t[1]=Math.sqrt(i*i+u*u+a*a),t[2]=Math.sqrt(c*c+s*s+l*l),t}function O(t,n){var e=n[0]+n[5]+n[10],r=0;return e>0?(r=2*Math.sqrt(e+1),t[3]=.25*r,t[0]=(n[6]-n[9])/r,t[1]=(n[8]-n[2])/r,t[2]=(n[1]-n[4])/r):n[0]>n[5]&&n[0]>n[10]?(r=2*Math.sqrt(1+n[0]-n[5]-n[10]),t[3]=(n[6]-n[9])/r,t[0]=.25*r,t[1]=(n[1]+n[4])/r,t[2]=(n[8]+n[2])/r):n[5]>n[10]?(r=2*Math.sqrt(1+n[5]-n[0]-n[10]),t[3]=(n[8]-n[2])/r,t[0]=(n[1]+n[4])/r,t[1]=.25*r,t[2]=(n[6]+n[9])/r):(r=2*Math.sqrt(1+n[10]-n[0]-n[5]),t[3]=(n[1]-n[4])/r,t[0]=(n[8]+n[2])/r,t[1]=(n[6]+n[9])/r,t[2]=.25*r),t}function z(t,n,e,r){var o=n[0],i=n[1],u=n[2],a=n[3],c=o+o,s=i+i,l=u+u,f=o*c,h=o*s,d=o*l,p=i*s,g=i*l,v=u*l,m=a*c,x=a*s,_=a*l,y=r[0],b=r[1],w=r[2];return t[0]=(1-(p+v))*y,t[1]=(h+_)*y,t[2]=(d-x)*y,t[3]=0,t[4]=(h-_)*b,t[5]=(1-(f+v))*b,t[6]=(g+m)*b,t[7]=0,t[8]=(d+x)*w,t[9]=(g-m)*w,t[10]=(1-(f+p))*w,t[11]=0,t[12]=e[0],t[13]=e[1],t[14]=e[2],t[15]=1,t}function L(t,n,e,r,o){var i=n[0],u=n[1],a=n[2],c=n[3],s=i+i,l=u+u,f=a+a,h=i*s,d=i*l,p=i*f,g=u*l,v=u*f,m=a*f,x=c*s,_=c*l,y=c*f,b=r[0],w=r[1],M=r[2],A=o[0],j=o[1],E=o[2],I=(1-(g+m))*b,P=(d+y)*b,S=(p-_)*b,T=(d-y)*w,O=(1-(h+m))*w,z=(v+x)*w,L=(p+_)*M,N=(v-x)*M,C=(1-(h+g))*M;return t[0]=I,t[1]=P,t[2]=S,t[3]=0,t[4]=T,t[5]=O,t[6]=z,t[7]=0,t[8]=L,t[9]=N,t[10]=C,t[11]=0,t[12]=e[0]+A-(I*A+T*j+L*E),t[13]=e[1]+j-(P*A+O*j+N*E),t[14]=e[2]+E-(S*A+z*j+C*E),t[15]=1,t}function N(t,n){var e=n[0],r=n[1],o=n[2],i=n[3],u=e+e,a=r+r,c=o+o,s=e*u,l=r*u,f=r*a,h=o*u,d=o*a,p=o*c,g=i*u,v=i*a,m=i*c;return t[0]=1-f-p,t[1]=l+m,t[2]=h-v,t[3]=0,t[4]=l-m,t[5]=1-s-p,t[6]=d+g,t[7]=0,t[8]=h+v,t[9]=d-g,t[10]=1-s-f,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function C(t,n,e,r,o,i,u){var a=1/(e-n),c=1/(o-r),s=1/(i-u);return t[0]=2*i*a,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=2*i*c,t[6]=0,t[7]=0,t[8]=(e+n)*a,t[9]=(o+r)*c,t[10]=(u+i)*s,t[11]=-1,t[12]=0,t[13]=0,t[14]=u*i*2*s,t[15]=0,t}function R(t,n,e,r,o){var i=1/Math.tan(n/2),u=void 0;return t[0]=i/e,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=i,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=-1,t[12]=0,t[13]=0,t[15]=0,null!=o&&o!==1/0?(u=1/(r-o),t[10]=(o+r)*u,t[14]=2*o*r*u):(t[10]=-1,t[14]=-2*r),t}function k(t,n,e,r){var o=Math.tan(n.upDegrees*Math.PI/180),i=Math.tan(n.downDegrees*Math.PI/180),u=Math.tan(n.leftDegrees*Math.PI/180),a=Math.tan(n.rightDegrees*Math.PI/180),c=2/(u+a),s=2/(o+i);return t[0]=c,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=s,t[6]=0,t[7]=0,t[8]=-(u-a)*c*.5,t[9]=(o-i)*s*.5,t[10]=r/(e-r),t[11]=-1,t[12]=0,t[13]=0,t[14]=r*e/(e-r),t[15]=0,t}function D(t,n,e,r,o,i,u){var a=1/(n-e),c=1/(r-o),s=1/(i-u);return t[0]=-2*a,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=-2*c,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=2*s,t[11]=0,t[12]=(n+e)*a,t[13]=(o+r)*c,t[14]=(u+i)*s,t[15]=1,t}function V(t,n,e,o){var i=void 0,u=void 0,a=void 0,c=void 0,l=void 0,f=void 0,h=void 0,d=void 0,p=void 0,g=void 0,v=n[0],m=n[1],x=n[2],_=o[0],y=o[1],b=o[2],w=e[0],M=e[1],A=e[2];return Math.abs(v-w)<r.EPSILON&&Math.abs(m-M)<r.EPSILON&&Math.abs(x-A)<r.EPSILON?s(t):(h=v-w,d=m-M,p=x-A,i=y*(p*=g=1/Math.sqrt(h*h+d*d+p*p))-b*(d*=g),u=b*(h*=g)-_*p,a=_*d-y*h,(g=Math.sqrt(i*i+u*u+a*a))?(i*=g=1/g,u*=g,a*=g):(i=0,u=0,a=0),c=d*a-p*u,l=p*i-h*a,f=h*u-d*i,(g=Math.sqrt(c*c+l*l+f*f))?(c*=g=1/g,l*=g,f*=g):(c=0,l=0,f=0),t[0]=i,t[1]=c,t[2]=h,t[3]=0,t[4]=u,t[5]=l,t[6]=d,t[7]=0,t[8]=a,t[9]=f,t[10]=p,t[11]=0,t[12]=-(i*v+u*m+a*x),t[13]=-(c*v+l*m+f*x),t[14]=-(h*v+d*m+p*x),t[15]=1,t)}function B(t,n,e,r){var o=n[0],i=n[1],u=n[2],a=r[0],c=r[1],s=r[2],l=o-e[0],f=i-e[1],h=u-e[2],d=l*l+f*f+h*h;d>0&&(l*=d=1/Math.sqrt(d),f*=d,h*=d);var p=c*h-s*f,g=s*l-a*h,v=a*f-c*l;return (d=p*p+g*g+v*v)>0&&(p*=d=1/Math.sqrt(d),g*=d,v*=d),t[0]=p,t[1]=g,t[2]=v,t[3]=0,t[4]=f*v-h*g,t[5]=h*p-l*v,t[6]=l*g-f*p,t[7]=0,t[8]=l,t[9]=f,t[10]=h,t[11]=0,t[12]=o,t[13]=i,t[14]=u,t[15]=1,t}function q(t){return "mat4("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+", "+t[8]+", "+t[9]+", "+t[10]+", "+t[11]+", "+t[12]+", "+t[13]+", "+t[14]+", "+t[15]+")"}function Y(t){return Math.sqrt(Math.pow(t[0],2)+Math.pow(t[1],2)+Math.pow(t[2],2)+Math.pow(t[3],2)+Math.pow(t[4],2)+Math.pow(t[5],2)+Math.pow(t[6],2)+Math.pow(t[7],2)+Math.pow(t[8],2)+Math.pow(t[9],2)+Math.pow(t[10],2)+Math.pow(t[11],2)+Math.pow(t[12],2)+Math.pow(t[13],2)+Math.pow(t[14],2)+Math.pow(t[15],2))}function U(t,n,e){return t[0]=n[0]+e[0],t[1]=n[1]+e[1],t[2]=n[2]+e[2],t[3]=n[3]+e[3],t[4]=n[4]+e[4],t[5]=n[5]+e[5],t[6]=n[6]+e[6],t[7]=n[7]+e[7],t[8]=n[8]+e[8],t[9]=n[9]+e[9],t[10]=n[10]+e[10],t[11]=n[11]+e[11],t[12]=n[12]+e[12],t[13]=n[13]+e[13],t[14]=n[14]+e[14],t[15]=n[15]+e[15],t}function F(t,n,e){return t[0]=n[0]-e[0],t[1]=n[1]-e[1],t[2]=n[2]-e[2],t[3]=n[3]-e[3],t[4]=n[4]-e[4],t[5]=n[5]-e[5],t[6]=n[6]-e[6],t[7]=n[7]-e[7],t[8]=n[8]-e[8],t[9]=n[9]-e[9],t[10]=n[10]-e[10],t[11]=n[11]-e[11],t[12]=n[12]-e[12],t[13]=n[13]-e[13],t[14]=n[14]-e[14],t[15]=n[15]-e[15],t}function X(t,n,e){return t[0]=n[0]*e,t[1]=n[1]*e,t[2]=n[2]*e,t[3]=n[3]*e,t[4]=n[4]*e,t[5]=n[5]*e,t[6]=n[6]*e,t[7]=n[7]*e,t[8]=n[8]*e,t[9]=n[9]*e,t[10]=n[10]*e,t[11]=n[11]*e,t[12]=n[12]*e,t[13]=n[13]*e,t[14]=n[14]*e,t[15]=n[15]*e,t}function G(t,n,e,r){return t[0]=n[0]+e[0]*r,t[1]=n[1]+e[1]*r,t[2]=n[2]+e[2]*r,t[3]=n[3]+e[3]*r,t[4]=n[4]+e[4]*r,t[5]=n[5]+e[5]*r,t[6]=n[6]+e[6]*r,t[7]=n[7]+e[7]*r,t[8]=n[8]+e[8]*r,t[9]=n[9]+e[9]*r,t[10]=n[10]+e[10]*r,t[11]=n[11]+e[11]*r,t[12]=n[12]+e[12]*r,t[13]=n[13]+e[13]*r,t[14]=n[14]+e[14]*r,t[15]=n[15]+e[15]*r,t}function Z(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]&&t[6]===n[6]&&t[7]===n[7]&&t[8]===n[8]&&t[9]===n[9]&&t[10]===n[10]&&t[11]===n[11]&&t[12]===n[12]&&t[13]===n[13]&&t[14]===n[14]&&t[15]===n[15]}function W(t,n){var e=t[0],o=t[1],i=t[2],u=t[3],a=t[4],c=t[5],s=t[6],l=t[7],f=t[8],h=t[9],d=t[10],p=t[11],g=t[12],v=t[13],m=t[14],x=t[15],_=n[0],y=n[1],b=n[2],w=n[3],M=n[4],A=n[5],j=n[6],E=n[7],I=n[8],P=n[9],S=n[10],T=n[11],O=n[12],z=n[13],L=n[14],N=n[15];return Math.abs(e-_)<=r.EPSILON*Math.max(1,Math.abs(e),Math.abs(_))&&Math.abs(o-y)<=r.EPSILON*Math.max(1,Math.abs(o),Math.abs(y))&&Math.abs(i-b)<=r.EPSILON*Math.max(1,Math.abs(i),Math.abs(b))&&Math.abs(u-w)<=r.EPSILON*Math.max(1,Math.abs(u),Math.abs(w))&&Math.abs(a-M)<=r.EPSILON*Math.max(1,Math.abs(a),Math.abs(M))&&Math.abs(c-A)<=r.EPSILON*Math.max(1,Math.abs(c),Math.abs(A))&&Math.abs(s-j)<=r.EPSILON*Math.max(1,Math.abs(s),Math.abs(j))&&Math.abs(l-E)<=r.EPSILON*Math.max(1,Math.abs(l),Math.abs(E))&&Math.abs(f-I)<=r.EPSILON*Math.max(1,Math.abs(f),Math.abs(I))&&Math.abs(h-P)<=r.EPSILON*Math.max(1,Math.abs(h),Math.abs(P))&&Math.abs(d-S)<=r.EPSILON*Math.max(1,Math.abs(d),Math.abs(S))&&Math.abs(p-T)<=r.EPSILON*Math.max(1,Math.abs(p),Math.abs(T))&&Math.abs(g-O)<=r.EPSILON*Math.max(1,Math.abs(g),Math.abs(O))&&Math.abs(v-z)<=r.EPSILON*Math.max(1,Math.abs(v),Math.abs(z))&&Math.abs(m-L)<=r.EPSILON*Math.max(1,Math.abs(m),Math.abs(L))&&Math.abs(x-N)<=r.EPSILON*Math.max(1,Math.abs(x),Math.abs(N))}var H=p,$=F;},"./node_modules/gl-matrix/lib/gl-matrix/quat.js":function(t,n,e){e.r(n),e.d(n,"create",function(){return a}),e.d(n,"identity",function(){return c}),e.d(n,"setAxisAngle",function(){return s}),e.d(n,"getAxisAngle",function(){return l}),e.d(n,"multiply",function(){return f}),e.d(n,"rotateX",function(){return h}),e.d(n,"rotateY",function(){return d}),e.d(n,"rotateZ",function(){return p}),e.d(n,"calculateW",function(){return g}),e.d(n,"slerp",function(){return v}),e.d(n,"random",function(){return m}),e.d(n,"invert",function(){return x}),e.d(n,"conjugate",function(){return _}),e.d(n,"fromMat3",function(){return y}),e.d(n,"fromEuler",function(){return b}),e.d(n,"str",function(){return w}),e.d(n,"clone",function(){return S}),e.d(n,"fromValues",function(){return T}),e.d(n,"copy",function(){return O}),e.d(n,"set",function(){return z}),e.d(n,"add",function(){return L}),e.d(n,"mul",function(){return N}),e.d(n,"scale",function(){return C}),e.d(n,"dot",function(){return R}),e.d(n,"lerp",function(){return k}),e.d(n,"length",function(){return D}),e.d(n,"len",function(){return V}),e.d(n,"squaredLength",function(){return B}),e.d(n,"sqrLen",function(){return q}),e.d(n,"normalize",function(){return Y}),e.d(n,"exactEquals",function(){return U}),e.d(n,"equals",function(){return F}),e.d(n,"rotationTo",function(){return X}),e.d(n,"sqlerp",function(){return G}),e.d(n,"setAxes",function(){return Z});var r=e("./node_modules/gl-matrix/lib/gl-matrix/common.js"),o=e("./node_modules/gl-matrix/lib/gl-matrix/mat3.js"),i=e("./node_modules/gl-matrix/lib/gl-matrix/vec3.js"),u=e("./node_modules/gl-matrix/lib/gl-matrix/vec4.js");function a(){var t=new r.ARRAY_TYPE(4);return r.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0),t[3]=1,t}function c(t){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t}function s(t,n,e){e*=.5;var r=Math.sin(e);return t[0]=r*n[0],t[1]=r*n[1],t[2]=r*n[2],t[3]=Math.cos(e),t}function l(t,n){var e=2*Math.acos(n[3]),o=Math.sin(e/2);return o>r.EPSILON?(t[0]=n[0]/o,t[1]=n[1]/o,t[2]=n[2]/o):(t[0]=1,t[1]=0,t[2]=0),e}function f(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=e[0],c=e[1],s=e[2],l=e[3];return t[0]=r*l+u*a+o*s-i*c,t[1]=o*l+u*c+i*a-r*s,t[2]=i*l+u*s+r*c-o*a,t[3]=u*l-r*a-o*c-i*s,t}function h(t,n,e){e*=.5;var r=n[0],o=n[1],i=n[2],u=n[3],a=Math.sin(e),c=Math.cos(e);return t[0]=r*c+u*a,t[1]=o*c+i*a,t[2]=i*c-o*a,t[3]=u*c-r*a,t}function d(t,n,e){e*=.5;var r=n[0],o=n[1],i=n[2],u=n[3],a=Math.sin(e),c=Math.cos(e);return t[0]=r*c-i*a,t[1]=o*c+u*a,t[2]=i*c+r*a,t[3]=u*c-o*a,t}function p(t,n,e){e*=.5;var r=n[0],o=n[1],i=n[2],u=n[3],a=Math.sin(e),c=Math.cos(e);return t[0]=r*c+o*a,t[1]=o*c-r*a,t[2]=i*c+u*a,t[3]=u*c-i*a,t}function g(t,n){var e=n[0],r=n[1],o=n[2];return t[0]=e,t[1]=r,t[2]=o,t[3]=Math.sqrt(Math.abs(1-e*e-r*r-o*o)),t}function v(t,n,e,o){var i=n[0],u=n[1],a=n[2],c=n[3],s=e[0],l=e[1],f=e[2],h=e[3],d=void 0,p=void 0,g=void 0,v=void 0,m=void 0;return (p=i*s+u*l+a*f+c*h)<0&&(p=-p,s=-s,l=-l,f=-f,h=-h),1-p>r.EPSILON?(d=Math.acos(p),g=Math.sin(d),v=Math.sin((1-o)*d)/g,m=Math.sin(o*d)/g):(v=1-o,m=o),t[0]=v*i+m*s,t[1]=v*u+m*l,t[2]=v*a+m*f,t[3]=v*c+m*h,t}function m(t){var n=r.RANDOM(),e=r.RANDOM(),o=r.RANDOM(),i=Math.sqrt(1-n),u=Math.sqrt(n);return t[0]=i*Math.sin(2*Math.PI*e),t[1]=i*Math.cos(2*Math.PI*e),t[2]=u*Math.sin(2*Math.PI*o),t[3]=u*Math.cos(2*Math.PI*o),t}function x(t,n){var e=n[0],r=n[1],o=n[2],i=n[3],u=e*e+r*r+o*o+i*i,a=u?1/u:0;return t[0]=-e*a,t[1]=-r*a,t[2]=-o*a,t[3]=i*a,t}function _(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=n[3],t}function y(t,n){var e=n[0]+n[4]+n[8],r=void 0;if(e>0)r=Math.sqrt(e+1),t[3]=.5*r,r=.5/r,t[0]=(n[5]-n[7])*r,t[1]=(n[6]-n[2])*r,t[2]=(n[1]-n[3])*r;else {var o=0;n[4]>n[0]&&(o=1),n[8]>n[3*o+o]&&(o=2);var i=(o+1)%3,u=(o+2)%3;r=Math.sqrt(n[3*o+o]-n[3*i+i]-n[3*u+u]+1),t[o]=.5*r,r=.5/r,t[3]=(n[3*i+u]-n[3*u+i])*r,t[i]=(n[3*i+o]+n[3*o+i])*r,t[u]=(n[3*u+o]+n[3*o+u])*r;}return t}function b(t,n,e,r){var o=.5*Math.PI/180;n*=o,e*=o,r*=o;var i=Math.sin(n),u=Math.cos(n),a=Math.sin(e),c=Math.cos(e),s=Math.sin(r),l=Math.cos(r);return t[0]=i*c*l-u*a*s,t[1]=u*a*l+i*c*s,t[2]=u*c*s-i*a*l,t[3]=u*c*l+i*a*s,t}function w(t){return "quat("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"}var M,A,j,E,I,P,S=u.clone,T=u.fromValues,O=u.copy,z=u.set,L=u.add,N=f,C=u.scale,R=u.dot,k=u.lerp,D=u.length,V=D,B=u.squaredLength,q=B,Y=u.normalize,U=u.exactEquals,F=u.equals,X=(M=i.create(),A=i.fromValues(1,0,0),j=i.fromValues(0,1,0),function(t,n,e){var r=i.dot(n,e);return r<-.999999?(i.cross(M,A,n),i.len(M)<1e-6&&i.cross(M,j,n),i.normalize(M,M),s(t,M,Math.PI),t):r>.999999?(t[0]=0,t[1]=0,t[2]=0,t[3]=1,t):(i.cross(M,n,e),t[0]=M[0],t[1]=M[1],t[2]=M[2],t[3]=1+r,Y(t,t))}),G=(E=a(),I=a(),function(t,n,e,r,o,i){return v(E,n,o,i),v(I,e,r,i),v(t,E,I,2*i*(1-i)),t}),Z=(P=o.create(),function(t,n,e,r){return P[0]=e[0],P[3]=e[1],P[6]=e[2],P[1]=r[0],P[4]=r[1],P[7]=r[2],P[2]=-n[0],P[5]=-n[1],P[8]=-n[2],Y(t,y(t,P))});},"./node_modules/gl-matrix/lib/gl-matrix/quat2.js":function(t,n,e){e.r(n),e.d(n,"create",function(){return u}),e.d(n,"clone",function(){return a}),e.d(n,"fromValues",function(){return c}),e.d(n,"fromRotationTranslationValues",function(){return s}),e.d(n,"fromRotationTranslation",function(){return l}),e.d(n,"fromTranslation",function(){return f}),e.d(n,"fromRotation",function(){return h}),e.d(n,"fromMat4",function(){return d}),e.d(n,"copy",function(){return p}),e.d(n,"identity",function(){return g}),e.d(n,"set",function(){return v}),e.d(n,"getReal",function(){return m}),e.d(n,"getDual",function(){return x}),e.d(n,"setReal",function(){return _}),e.d(n,"setDual",function(){return y}),e.d(n,"getTranslation",function(){return b}),e.d(n,"translate",function(){return w}),e.d(n,"rotateX",function(){return M}),e.d(n,"rotateY",function(){return A}),e.d(n,"rotateZ",function(){return j}),e.d(n,"rotateByQuatAppend",function(){return E}),e.d(n,"rotateByQuatPrepend",function(){return I}),e.d(n,"rotateAroundAxis",function(){return P}),e.d(n,"add",function(){return S}),e.d(n,"multiply",function(){return T}),e.d(n,"mul",function(){return O}),e.d(n,"scale",function(){return z}),e.d(n,"dot",function(){return L}),e.d(n,"lerp",function(){return N}),e.d(n,"invert",function(){return C}),e.d(n,"conjugate",function(){return R}),e.d(n,"length",function(){return k}),e.d(n,"len",function(){return D}),e.d(n,"squaredLength",function(){return V}),e.d(n,"sqrLen",function(){return B}),e.d(n,"normalize",function(){return q}),e.d(n,"str",function(){return Y}),e.d(n,"exactEquals",function(){return U}),e.d(n,"equals",function(){return F});var r=e("./node_modules/gl-matrix/lib/gl-matrix/common.js"),o=e("./node_modules/gl-matrix/lib/gl-matrix/quat.js"),i=e("./node_modules/gl-matrix/lib/gl-matrix/mat4.js");function u(){var t=new r.ARRAY_TYPE(8);return r.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0,t[4]=0,t[5]=0,t[6]=0,t[7]=0),t[3]=1,t}function a(t){var n=new r.ARRAY_TYPE(8);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n[4]=t[4],n[5]=t[5],n[6]=t[6],n[7]=t[7],n}function c(t,n,e,o,i,u,a,c){var s=new r.ARRAY_TYPE(8);return s[0]=t,s[1]=n,s[2]=e,s[3]=o,s[4]=i,s[5]=u,s[6]=a,s[7]=c,s}function s(t,n,e,o,i,u,a){var c=new r.ARRAY_TYPE(8);c[0]=t,c[1]=n,c[2]=e,c[3]=o;var s=.5*i,l=.5*u,f=.5*a;return c[4]=s*o+l*e-f*n,c[5]=l*o+f*t-s*e,c[6]=f*o+s*n-l*t,c[7]=-s*t-l*n-f*e,c}function l(t,n,e){var r=.5*e[0],o=.5*e[1],i=.5*e[2],u=n[0],a=n[1],c=n[2],s=n[3];return t[0]=u,t[1]=a,t[2]=c,t[3]=s,t[4]=r*s+o*c-i*a,t[5]=o*s+i*u-r*c,t[6]=i*s+r*a-o*u,t[7]=-r*u-o*a-i*c,t}function f(t,n){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t[4]=.5*n[0],t[5]=.5*n[1],t[6]=.5*n[2],t[7]=0,t}function h(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=0,t[5]=0,t[6]=0,t[7]=0,t}function d(t,n){var e=o.create();i.getRotation(e,n);var u=new r.ARRAY_TYPE(3);return i.getTranslation(u,n),l(t,e,u),t}function p(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t}function g(t){return t[0]=0,t[1]=0,t[2]=0,t[3]=1,t[4]=0,t[5]=0,t[6]=0,t[7]=0,t}function v(t,n,e,r,o,i,u,a,c){return t[0]=n,t[1]=e,t[2]=r,t[3]=o,t[4]=i,t[5]=u,t[6]=a,t[7]=c,t}var m=o.copy;function x(t,n){return t[0]=n[4],t[1]=n[5],t[2]=n[6],t[3]=n[7],t}var _=o.copy;function y(t,n){return t[4]=n[0],t[5]=n[1],t[6]=n[2],t[7]=n[3],t}function b(t,n){var e=n[4],r=n[5],o=n[6],i=n[7],u=-n[0],a=-n[1],c=-n[2],s=n[3];return t[0]=2*(e*s+i*u+r*c-o*a),t[1]=2*(r*s+i*a+o*u-e*c),t[2]=2*(o*s+i*c+e*a-r*u),t}function w(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=.5*e[0],c=.5*e[1],s=.5*e[2],l=n[4],f=n[5],h=n[6],d=n[7];return t[0]=r,t[1]=o,t[2]=i,t[3]=u,t[4]=u*a+o*s-i*c+l,t[5]=u*c+i*a-r*s+f,t[6]=u*s+r*c-o*a+h,t[7]=-r*a-o*c-i*s+d,t}function M(t,n,e){var r=-n[0],i=-n[1],u=-n[2],a=n[3],c=n[4],s=n[5],l=n[6],f=n[7],h=c*a+f*r+s*u-l*i,d=s*a+f*i+l*r-c*u,p=l*a+f*u+c*i-s*r,g=f*a-c*r-s*i-l*u;return o.rotateX(t,n,e),r=t[0],i=t[1],u=t[2],a=t[3],t[4]=h*a+g*r+d*u-p*i,t[5]=d*a+g*i+p*r-h*u,t[6]=p*a+g*u+h*i-d*r,t[7]=g*a-h*r-d*i-p*u,t}function A(t,n,e){var r=-n[0],i=-n[1],u=-n[2],a=n[3],c=n[4],s=n[5],l=n[6],f=n[7],h=c*a+f*r+s*u-l*i,d=s*a+f*i+l*r-c*u,p=l*a+f*u+c*i-s*r,g=f*a-c*r-s*i-l*u;return o.rotateY(t,n,e),r=t[0],i=t[1],u=t[2],a=t[3],t[4]=h*a+g*r+d*u-p*i,t[5]=d*a+g*i+p*r-h*u,t[6]=p*a+g*u+h*i-d*r,t[7]=g*a-h*r-d*i-p*u,t}function j(t,n,e){var r=-n[0],i=-n[1],u=-n[2],a=n[3],c=n[4],s=n[5],l=n[6],f=n[7],h=c*a+f*r+s*u-l*i,d=s*a+f*i+l*r-c*u,p=l*a+f*u+c*i-s*r,g=f*a-c*r-s*i-l*u;return o.rotateZ(t,n,e),r=t[0],i=t[1],u=t[2],a=t[3],t[4]=h*a+g*r+d*u-p*i,t[5]=d*a+g*i+p*r-h*u,t[6]=p*a+g*u+h*i-d*r,t[7]=g*a-h*r-d*i-p*u,t}function E(t,n,e){var r=e[0],o=e[1],i=e[2],u=e[3],a=n[0],c=n[1],s=n[2],l=n[3];return t[0]=a*u+l*r+c*i-s*o,t[1]=c*u+l*o+s*r-a*i,t[2]=s*u+l*i+a*o-c*r,t[3]=l*u-a*r-c*o-s*i,a=n[4],c=n[5],s=n[6],l=n[7],t[4]=a*u+l*r+c*i-s*o,t[5]=c*u+l*o+s*r-a*i,t[6]=s*u+l*i+a*o-c*r,t[7]=l*u-a*r-c*o-s*i,t}function I(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=e[0],c=e[1],s=e[2],l=e[3];return t[0]=r*l+u*a+o*s-i*c,t[1]=o*l+u*c+i*a-r*s,t[2]=i*l+u*s+r*c-o*a,t[3]=u*l-r*a-o*c-i*s,a=e[4],c=e[5],s=e[6],l=e[7],t[4]=r*l+u*a+o*s-i*c,t[5]=o*l+u*c+i*a-r*s,t[6]=i*l+u*s+r*c-o*a,t[7]=u*l-r*a-o*c-i*s,t}function P(t,n,e,o){if(Math.abs(o)<r.EPSILON)return p(t,n);var i=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);o*=.5;var u=Math.sin(o),a=u*e[0]/i,c=u*e[1]/i,s=u*e[2]/i,l=Math.cos(o),f=n[0],h=n[1],d=n[2],g=n[3];t[0]=f*l+g*a+h*s-d*c,t[1]=h*l+g*c+d*a-f*s,t[2]=d*l+g*s+f*c-h*a,t[3]=g*l-f*a-h*c-d*s;var v=n[4],m=n[5],x=n[6],_=n[7];return t[4]=v*l+_*a+m*s-x*c,t[5]=m*l+_*c+x*a-v*s,t[6]=x*l+_*s+v*c-m*a,t[7]=_*l-v*a-m*c-x*s,t}function S(t,n,e){return t[0]=n[0]+e[0],t[1]=n[1]+e[1],t[2]=n[2]+e[2],t[3]=n[3]+e[3],t[4]=n[4]+e[4],t[5]=n[5]+e[5],t[6]=n[6]+e[6],t[7]=n[7]+e[7],t}function T(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3],a=e[4],c=e[5],s=e[6],l=e[7],f=n[4],h=n[5],d=n[6],p=n[7],g=e[0],v=e[1],m=e[2],x=e[3];return t[0]=r*x+u*g+o*m-i*v,t[1]=o*x+u*v+i*g-r*m,t[2]=i*x+u*m+r*v-o*g,t[3]=u*x-r*g-o*v-i*m,t[4]=r*l+u*a+o*s-i*c+f*x+p*g+h*m-d*v,t[5]=o*l+u*c+i*a-r*s+h*x+p*v+d*g-f*m,t[6]=i*l+u*s+r*c-o*a+d*x+p*m+f*v-h*g,t[7]=u*l-r*a-o*c-i*s+p*x-f*g-h*v-d*m,t}var O=T;function z(t,n,e){return t[0]=n[0]*e,t[1]=n[1]*e,t[2]=n[2]*e,t[3]=n[3]*e,t[4]=n[4]*e,t[5]=n[5]*e,t[6]=n[6]*e,t[7]=n[7]*e,t}var L=o.dot;function N(t,n,e,r){var o=1-r;return L(n,e)<0&&(r=-r),t[0]=n[0]*o+e[0]*r,t[1]=n[1]*o+e[1]*r,t[2]=n[2]*o+e[2]*r,t[3]=n[3]*o+e[3]*r,t[4]=n[4]*o+e[4]*r,t[5]=n[5]*o+e[5]*r,t[6]=n[6]*o+e[6]*r,t[7]=n[7]*o+e[7]*r,t}function C(t,n){var e=V(n);return t[0]=-n[0]/e,t[1]=-n[1]/e,t[2]=-n[2]/e,t[3]=n[3]/e,t[4]=-n[4]/e,t[5]=-n[5]/e,t[6]=-n[6]/e,t[7]=n[7]/e,t}function R(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=n[3],t[4]=-n[4],t[5]=-n[5],t[6]=-n[6],t[7]=n[7],t}var k=o.length,D=k,V=o.squaredLength,B=V;function q(t,n){var e=V(n);if(e>0){e=Math.sqrt(e);var r=n[0]/e,o=n[1]/e,i=n[2]/e,u=n[3]/e,a=n[4],c=n[5],s=n[6],l=n[7],f=r*a+o*c+i*s+u*l;t[0]=r,t[1]=o,t[2]=i,t[3]=u,t[4]=(a-r*f)/e,t[5]=(c-o*f)/e,t[6]=(s-i*f)/e,t[7]=(l-u*f)/e;}return t}function Y(t){return "quat2("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+", "+t[4]+", "+t[5]+", "+t[6]+", "+t[7]+")"}function U(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]&&t[4]===n[4]&&t[5]===n[5]&&t[6]===n[6]&&t[7]===n[7]}function F(t,n){var e=t[0],o=t[1],i=t[2],u=t[3],a=t[4],c=t[5],s=t[6],l=t[7],f=n[0],h=n[1],d=n[2],p=n[3],g=n[4],v=n[5],m=n[6],x=n[7];return Math.abs(e-f)<=r.EPSILON*Math.max(1,Math.abs(e),Math.abs(f))&&Math.abs(o-h)<=r.EPSILON*Math.max(1,Math.abs(o),Math.abs(h))&&Math.abs(i-d)<=r.EPSILON*Math.max(1,Math.abs(i),Math.abs(d))&&Math.abs(u-p)<=r.EPSILON*Math.max(1,Math.abs(u),Math.abs(p))&&Math.abs(a-g)<=r.EPSILON*Math.max(1,Math.abs(a),Math.abs(g))&&Math.abs(c-v)<=r.EPSILON*Math.max(1,Math.abs(c),Math.abs(v))&&Math.abs(s-m)<=r.EPSILON*Math.max(1,Math.abs(s),Math.abs(m))&&Math.abs(l-x)<=r.EPSILON*Math.max(1,Math.abs(l),Math.abs(x))}},"./node_modules/gl-matrix/lib/gl-matrix/vec2.js":function(t,n,e){e.r(n),e.d(n,"create",function(){return o}),e.d(n,"clone",function(){return i}),e.d(n,"fromValues",function(){return u}),e.d(n,"copy",function(){return a}),e.d(n,"set",function(){return c}),e.d(n,"add",function(){return s}),e.d(n,"subtract",function(){return l}),e.d(n,"multiply",function(){return f}),e.d(n,"divide",function(){return h}),e.d(n,"ceil",function(){return d}),e.d(n,"floor",function(){return p}),e.d(n,"min",function(){return g}),e.d(n,"max",function(){return v}),e.d(n,"round",function(){return m}),e.d(n,"scale",function(){return x}),e.d(n,"scaleAndAdd",function(){return _}),e.d(n,"distance",function(){return y}),e.d(n,"squaredDistance",function(){return b}),e.d(n,"length",function(){return w}),e.d(n,"squaredLength",function(){return M}),e.d(n,"negate",function(){return A}),e.d(n,"inverse",function(){return j}),e.d(n,"normalize",function(){return E}),e.d(n,"dot",function(){return I}),e.d(n,"cross",function(){return P}),e.d(n,"lerp",function(){return S}),e.d(n,"random",function(){return T}),e.d(n,"transformMat2",function(){return O}),e.d(n,"transformMat2d",function(){return z}),e.d(n,"transformMat3",function(){return L}),e.d(n,"transformMat4",function(){return N}),e.d(n,"rotate",function(){return C}),e.d(n,"angle",function(){return R}),e.d(n,"str",function(){return k}),e.d(n,"exactEquals",function(){return D}),e.d(n,"equals",function(){return V}),e.d(n,"len",function(){return q}),e.d(n,"sub",function(){return Y}),e.d(n,"mul",function(){return U}),e.d(n,"div",function(){return F}),e.d(n,"dist",function(){return X}),e.d(n,"sqrDist",function(){return G}),e.d(n,"sqrLen",function(){return Z}),e.d(n,"forEach",function(){return W});var r=e("./node_modules/gl-matrix/lib/gl-matrix/common.js");function o(){var t=new r.ARRAY_TYPE(2);return r.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0),t}function i(t){var n=new r.ARRAY_TYPE(2);return n[0]=t[0],n[1]=t[1],n}function u(t,n){var e=new r.ARRAY_TYPE(2);return e[0]=t,e[1]=n,e}function a(t,n){return t[0]=n[0],t[1]=n[1],t}function c(t,n,e){return t[0]=n,t[1]=e,t}function s(t,n,e){return t[0]=n[0]+e[0],t[1]=n[1]+e[1],t}function l(t,n,e){return t[0]=n[0]-e[0],t[1]=n[1]-e[1],t}function f(t,n,e){return t[0]=n[0]*e[0],t[1]=n[1]*e[1],t}function h(t,n,e){return t[0]=n[0]/e[0],t[1]=n[1]/e[1],t}function d(t,n){return t[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t}function p(t,n){return t[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t}function g(t,n,e){return t[0]=Math.min(n[0],e[0]),t[1]=Math.min(n[1],e[1]),t}function v(t,n,e){return t[0]=Math.max(n[0],e[0]),t[1]=Math.max(n[1],e[1]),t}function m(t,n){return t[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t}function x(t,n,e){return t[0]=n[0]*e,t[1]=n[1]*e,t}function _(t,n,e,r){return t[0]=n[0]+e[0]*r,t[1]=n[1]+e[1]*r,t}function y(t,n){var e=n[0]-t[0],r=n[1]-t[1];return Math.sqrt(e*e+r*r)}function b(t,n){var e=n[0]-t[0],r=n[1]-t[1];return e*e+r*r}function w(t){var n=t[0],e=t[1];return Math.sqrt(n*n+e*e)}function M(t){var n=t[0],e=t[1];return n*n+e*e}function A(t,n){return t[0]=-n[0],t[1]=-n[1],t}function j(t,n){return t[0]=1/n[0],t[1]=1/n[1],t}function E(t,n){var e=n[0],r=n[1],o=e*e+r*r;return o>0&&(o=1/Math.sqrt(o),t[0]=n[0]*o,t[1]=n[1]*o),t}function I(t,n){return t[0]*n[0]+t[1]*n[1]}function P(t,n,e){var r=n[0]*e[1]-n[1]*e[0];return t[0]=t[1]=0,t[2]=r,t}function S(t,n,e,r){var o=n[0],i=n[1];return t[0]=o+r*(e[0]-o),t[1]=i+r*(e[1]-i),t}function T(t,n){n=n||1;var e=2*r.RANDOM()*Math.PI;return t[0]=Math.cos(e)*n,t[1]=Math.sin(e)*n,t}function O(t,n,e){var r=n[0],o=n[1];return t[0]=e[0]*r+e[2]*o,t[1]=e[1]*r+e[3]*o,t}function z(t,n,e){var r=n[0],o=n[1];return t[0]=e[0]*r+e[2]*o+e[4],t[1]=e[1]*r+e[3]*o+e[5],t}function L(t,n,e){var r=n[0],o=n[1];return t[0]=e[0]*r+e[3]*o+e[6],t[1]=e[1]*r+e[4]*o+e[7],t}function N(t,n,e){var r=n[0],o=n[1];return t[0]=e[0]*r+e[4]*o+e[12],t[1]=e[1]*r+e[5]*o+e[13],t}function C(t,n,e,r){var o=n[0]-e[0],i=n[1]-e[1],u=Math.sin(r),a=Math.cos(r);return t[0]=o*a-i*u+e[0],t[1]=o*u+i*a+e[1],t}function R(t,n){var e=t[0],r=t[1],o=n[0],i=n[1],u=e*e+r*r;u>0&&(u=1/Math.sqrt(u));var a=o*o+i*i;a>0&&(a=1/Math.sqrt(a));var c=(e*o+r*i)*u*a;return c>1?0:c<-1?Math.PI:Math.acos(c)}function k(t){return "vec2("+t[0]+", "+t[1]+")"}function D(t,n){return t[0]===n[0]&&t[1]===n[1]}function V(t,n){var e=t[0],o=t[1],i=n[0],u=n[1];return Math.abs(e-i)<=r.EPSILON*Math.max(1,Math.abs(e),Math.abs(i))&&Math.abs(o-u)<=r.EPSILON*Math.max(1,Math.abs(o),Math.abs(u))}var B,q=w,Y=l,U=f,F=h,X=y,G=b,Z=M,W=(B=o(),function(t,n,e,r,o,i){var u=void 0,a=void 0;for(n||(n=2),e||(e=0),a=r?Math.min(r*n+e,t.length):t.length,u=e;u<a;u+=n)B[0]=t[u],B[1]=t[u+1],o(B,B,i),t[u]=B[0],t[u+1]=B[1];return t});},"./node_modules/gl-matrix/lib/gl-matrix/vec3.js":function(t,n,e){e.r(n),e.d(n,"create",function(){return o}),e.d(n,"clone",function(){return i}),e.d(n,"length",function(){return u}),e.d(n,"fromValues",function(){return a}),e.d(n,"copy",function(){return c}),e.d(n,"set",function(){return s}),e.d(n,"add",function(){return l}),e.d(n,"subtract",function(){return f}),e.d(n,"multiply",function(){return h}),e.d(n,"divide",function(){return d}),e.d(n,"ceil",function(){return p}),e.d(n,"floor",function(){return g}),e.d(n,"min",function(){return v}),e.d(n,"max",function(){return m}),e.d(n,"round",function(){return x}),e.d(n,"scale",function(){return _}),e.d(n,"scaleAndAdd",function(){return y}),e.d(n,"distance",function(){return b}),e.d(n,"squaredDistance",function(){return w}),e.d(n,"squaredLength",function(){return M}),e.d(n,"negate",function(){return A}),e.d(n,"inverse",function(){return j}),e.d(n,"normalize",function(){return E}),e.d(n,"dot",function(){return I}),e.d(n,"cross",function(){return P}),e.d(n,"lerp",function(){return S}),e.d(n,"hermite",function(){return T}),e.d(n,"bezier",function(){return O}),e.d(n,"random",function(){return z}),e.d(n,"transformMat4",function(){return L}),e.d(n,"transformMat3",function(){return N}),e.d(n,"transformQuat",function(){return C}),e.d(n,"rotateX",function(){return R}),e.d(n,"rotateY",function(){return k}),e.d(n,"rotateZ",function(){return D}),e.d(n,"angle",function(){return V}),e.d(n,"str",function(){return B}),e.d(n,"exactEquals",function(){return q}),e.d(n,"equals",function(){return Y}),e.d(n,"sub",function(){return F}),e.d(n,"mul",function(){return X}),e.d(n,"div",function(){return G}),e.d(n,"dist",function(){return Z}),e.d(n,"sqrDist",function(){return W}),e.d(n,"len",function(){return H}),e.d(n,"sqrLen",function(){return $}),e.d(n,"forEach",function(){return K});var r=e("./node_modules/gl-matrix/lib/gl-matrix/common.js");function o(){var t=new r.ARRAY_TYPE(3);return r.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0),t}function i(t){var n=new r.ARRAY_TYPE(3);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n}function u(t){var n=t[0],e=t[1],r=t[2];return Math.sqrt(n*n+e*e+r*r)}function a(t,n,e){var o=new r.ARRAY_TYPE(3);return o[0]=t,o[1]=n,o[2]=e,o}function c(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t}function s(t,n,e,r){return t[0]=n,t[1]=e,t[2]=r,t}function l(t,n,e){return t[0]=n[0]+e[0],t[1]=n[1]+e[1],t[2]=n[2]+e[2],t}function f(t,n,e){return t[0]=n[0]-e[0],t[1]=n[1]-e[1],t[2]=n[2]-e[2],t}function h(t,n,e){return t[0]=n[0]*e[0],t[1]=n[1]*e[1],t[2]=n[2]*e[2],t}function d(t,n,e){return t[0]=n[0]/e[0],t[1]=n[1]/e[1],t[2]=n[2]/e[2],t}function p(t,n){return t[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t[2]=Math.ceil(n[2]),t}function g(t,n){return t[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t[2]=Math.floor(n[2]),t}function v(t,n,e){return t[0]=Math.min(n[0],e[0]),t[1]=Math.min(n[1],e[1]),t[2]=Math.min(n[2],e[2]),t}function m(t,n,e){return t[0]=Math.max(n[0],e[0]),t[1]=Math.max(n[1],e[1]),t[2]=Math.max(n[2],e[2]),t}function x(t,n){return t[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t[2]=Math.round(n[2]),t}function _(t,n,e){return t[0]=n[0]*e,t[1]=n[1]*e,t[2]=n[2]*e,t}function y(t,n,e,r){return t[0]=n[0]+e[0]*r,t[1]=n[1]+e[1]*r,t[2]=n[2]+e[2]*r,t}function b(t,n){var e=n[0]-t[0],r=n[1]-t[1],o=n[2]-t[2];return Math.sqrt(e*e+r*r+o*o)}function w(t,n){var e=n[0]-t[0],r=n[1]-t[1],o=n[2]-t[2];return e*e+r*r+o*o}function M(t){var n=t[0],e=t[1],r=t[2];return n*n+e*e+r*r}function A(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t}function j(t,n){return t[0]=1/n[0],t[1]=1/n[1],t[2]=1/n[2],t}function E(t,n){var e=n[0],r=n[1],o=n[2],i=e*e+r*r+o*o;return i>0&&(i=1/Math.sqrt(i),t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i),t}function I(t,n){return t[0]*n[0]+t[1]*n[1]+t[2]*n[2]}function P(t,n,e){var r=n[0],o=n[1],i=n[2],u=e[0],a=e[1],c=e[2];return t[0]=o*c-i*a,t[1]=i*u-r*c,t[2]=r*a-o*u,t}function S(t,n,e,r){var o=n[0],i=n[1],u=n[2];return t[0]=o+r*(e[0]-o),t[1]=i+r*(e[1]-i),t[2]=u+r*(e[2]-u),t}function T(t,n,e,r,o,i){var u=i*i,a=u*(2*i-3)+1,c=u*(i-2)+i,s=u*(i-1),l=u*(3-2*i);return t[0]=n[0]*a+e[0]*c+r[0]*s+o[0]*l,t[1]=n[1]*a+e[1]*c+r[1]*s+o[1]*l,t[2]=n[2]*a+e[2]*c+r[2]*s+o[2]*l,t}function O(t,n,e,r,o,i){var u=1-i,a=u*u,c=i*i,s=a*u,l=3*i*a,f=3*c*u,h=c*i;return t[0]=n[0]*s+e[0]*l+r[0]*f+o[0]*h,t[1]=n[1]*s+e[1]*l+r[1]*f+o[1]*h,t[2]=n[2]*s+e[2]*l+r[2]*f+o[2]*h,t}function z(t,n){n=n||1;var e=2*r.RANDOM()*Math.PI,o=2*r.RANDOM()-1,i=Math.sqrt(1-o*o)*n;return t[0]=Math.cos(e)*i,t[1]=Math.sin(e)*i,t[2]=o*n,t}function L(t,n,e){var r=n[0],o=n[1],i=n[2],u=e[3]*r+e[7]*o+e[11]*i+e[15];return u=u||1,t[0]=(e[0]*r+e[4]*o+e[8]*i+e[12])/u,t[1]=(e[1]*r+e[5]*o+e[9]*i+e[13])/u,t[2]=(e[2]*r+e[6]*o+e[10]*i+e[14])/u,t}function N(t,n,e){var r=n[0],o=n[1],i=n[2];return t[0]=r*e[0]+o*e[3]+i*e[6],t[1]=r*e[1]+o*e[4]+i*e[7],t[2]=r*e[2]+o*e[5]+i*e[8],t}function C(t,n,e){var r=e[0],o=e[1],i=e[2],u=e[3],a=n[0],c=n[1],s=n[2],l=o*s-i*c,f=i*a-r*s,h=r*c-o*a,d=o*h-i*f,p=i*l-r*h,g=r*f-o*l,v=2*u;return l*=v,f*=v,h*=v,d*=2,p*=2,g*=2,t[0]=a+l+d,t[1]=c+f+p,t[2]=s+h+g,t}function R(t,n,e,r){var o=[],i=[];return o[0]=n[0]-e[0],o[1]=n[1]-e[1],o[2]=n[2]-e[2],i[0]=o[0],i[1]=o[1]*Math.cos(r)-o[2]*Math.sin(r),i[2]=o[1]*Math.sin(r)+o[2]*Math.cos(r),t[0]=i[0]+e[0],t[1]=i[1]+e[1],t[2]=i[2]+e[2],t}function k(t,n,e,r){var o=[],i=[];return o[0]=n[0]-e[0],o[1]=n[1]-e[1],o[2]=n[2]-e[2],i[0]=o[2]*Math.sin(r)+o[0]*Math.cos(r),i[1]=o[1],i[2]=o[2]*Math.cos(r)-o[0]*Math.sin(r),t[0]=i[0]+e[0],t[1]=i[1]+e[1],t[2]=i[2]+e[2],t}function D(t,n,e,r){var o=[],i=[];return o[0]=n[0]-e[0],o[1]=n[1]-e[1],o[2]=n[2]-e[2],i[0]=o[0]*Math.cos(r)-o[1]*Math.sin(r),i[1]=o[0]*Math.sin(r)+o[1]*Math.cos(r),i[2]=o[2],t[0]=i[0]+e[0],t[1]=i[1]+e[1],t[2]=i[2]+e[2],t}function V(t,n){var e=a(t[0],t[1],t[2]),r=a(n[0],n[1],n[2]);E(e,e),E(r,r);var o=I(e,r);return o>1?0:o<-1?Math.PI:Math.acos(o)}function B(t){return "vec3("+t[0]+", "+t[1]+", "+t[2]+")"}function q(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]}function Y(t,n){var e=t[0],o=t[1],i=t[2],u=n[0],a=n[1],c=n[2];return Math.abs(e-u)<=r.EPSILON*Math.max(1,Math.abs(e),Math.abs(u))&&Math.abs(o-a)<=r.EPSILON*Math.max(1,Math.abs(o),Math.abs(a))&&Math.abs(i-c)<=r.EPSILON*Math.max(1,Math.abs(i),Math.abs(c))}var U,F=f,X=h,G=d,Z=b,W=w,H=u,$=M,K=(U=o(),function(t,n,e,r,o,i){var u=void 0,a=void 0;for(n||(n=3),e||(e=0),a=r?Math.min(r*n+e,t.length):t.length,u=e;u<a;u+=n)U[0]=t[u],U[1]=t[u+1],U[2]=t[u+2],o(U,U,i),t[u]=U[0],t[u+1]=U[1],t[u+2]=U[2];return t});},"./node_modules/gl-matrix/lib/gl-matrix/vec4.js":function(t,n,e){e.r(n),e.d(n,"create",function(){return o}),e.d(n,"clone",function(){return i}),e.d(n,"fromValues",function(){return u}),e.d(n,"copy",function(){return a}),e.d(n,"set",function(){return c}),e.d(n,"add",function(){return s}),e.d(n,"subtract",function(){return l}),e.d(n,"multiply",function(){return f}),e.d(n,"divide",function(){return h}),e.d(n,"ceil",function(){return d}),e.d(n,"floor",function(){return p}),e.d(n,"min",function(){return g}),e.d(n,"max",function(){return v}),e.d(n,"round",function(){return m}),e.d(n,"scale",function(){return x}),e.d(n,"scaleAndAdd",function(){return _}),e.d(n,"distance",function(){return y}),e.d(n,"squaredDistance",function(){return b}),e.d(n,"length",function(){return w}),e.d(n,"squaredLength",function(){return M}),e.d(n,"negate",function(){return A}),e.d(n,"inverse",function(){return j}),e.d(n,"normalize",function(){return E}),e.d(n,"dot",function(){return I}),e.d(n,"lerp",function(){return P}),e.d(n,"random",function(){return S}),e.d(n,"transformMat4",function(){return T}),e.d(n,"transformQuat",function(){return O}),e.d(n,"str",function(){return z}),e.d(n,"exactEquals",function(){return L}),e.d(n,"equals",function(){return N}),e.d(n,"sub",function(){return R}),e.d(n,"mul",function(){return k}),e.d(n,"div",function(){return D}),e.d(n,"dist",function(){return V}),e.d(n,"sqrDist",function(){return B}),e.d(n,"len",function(){return q}),e.d(n,"sqrLen",function(){return Y}),e.d(n,"forEach",function(){return U});var r=e("./node_modules/gl-matrix/lib/gl-matrix/common.js");function o(){var t=new r.ARRAY_TYPE(4);return r.ARRAY_TYPE!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0,t[3]=0),t}function i(t){var n=new r.ARRAY_TYPE(4);return n[0]=t[0],n[1]=t[1],n[2]=t[2],n[3]=t[3],n}function u(t,n,e,o){var i=new r.ARRAY_TYPE(4);return i[0]=t,i[1]=n,i[2]=e,i[3]=o,i}function a(t,n){return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t}function c(t,n,e,r,o){return t[0]=n,t[1]=e,t[2]=r,t[3]=o,t}function s(t,n,e){return t[0]=n[0]+e[0],t[1]=n[1]+e[1],t[2]=n[2]+e[2],t[3]=n[3]+e[3],t}function l(t,n,e){return t[0]=n[0]-e[0],t[1]=n[1]-e[1],t[2]=n[2]-e[2],t[3]=n[3]-e[3],t}function f(t,n,e){return t[0]=n[0]*e[0],t[1]=n[1]*e[1],t[2]=n[2]*e[2],t[3]=n[3]*e[3],t}function h(t,n,e){return t[0]=n[0]/e[0],t[1]=n[1]/e[1],t[2]=n[2]/e[2],t[3]=n[3]/e[3],t}function d(t,n){return t[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t[2]=Math.ceil(n[2]),t[3]=Math.ceil(n[3]),t}function p(t,n){return t[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t[2]=Math.floor(n[2]),t[3]=Math.floor(n[3]),t}function g(t,n,e){return t[0]=Math.min(n[0],e[0]),t[1]=Math.min(n[1],e[1]),t[2]=Math.min(n[2],e[2]),t[3]=Math.min(n[3],e[3]),t}function v(t,n,e){return t[0]=Math.max(n[0],e[0]),t[1]=Math.max(n[1],e[1]),t[2]=Math.max(n[2],e[2]),t[3]=Math.max(n[3],e[3]),t}function m(t,n){return t[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t[2]=Math.round(n[2]),t[3]=Math.round(n[3]),t}function x(t,n,e){return t[0]=n[0]*e,t[1]=n[1]*e,t[2]=n[2]*e,t[3]=n[3]*e,t}function _(t,n,e,r){return t[0]=n[0]+e[0]*r,t[1]=n[1]+e[1]*r,t[2]=n[2]+e[2]*r,t[3]=n[3]+e[3]*r,t}function y(t,n){var e=n[0]-t[0],r=n[1]-t[1],o=n[2]-t[2],i=n[3]-t[3];return Math.sqrt(e*e+r*r+o*o+i*i)}function b(t,n){var e=n[0]-t[0],r=n[1]-t[1],o=n[2]-t[2],i=n[3]-t[3];return e*e+r*r+o*o+i*i}function w(t){var n=t[0],e=t[1],r=t[2],o=t[3];return Math.sqrt(n*n+e*e+r*r+o*o)}function M(t){var n=t[0],e=t[1],r=t[2],o=t[3];return n*n+e*e+r*r+o*o}function A(t,n){return t[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=-n[3],t}function j(t,n){return t[0]=1/n[0],t[1]=1/n[1],t[2]=1/n[2],t[3]=1/n[3],t}function E(t,n){var e=n[0],r=n[1],o=n[2],i=n[3],u=e*e+r*r+o*o+i*i;return u>0&&(u=1/Math.sqrt(u),t[0]=e*u,t[1]=r*u,t[2]=o*u,t[3]=i*u),t}function I(t,n){return t[0]*n[0]+t[1]*n[1]+t[2]*n[2]+t[3]*n[3]}function P(t,n,e,r){var o=n[0],i=n[1],u=n[2],a=n[3];return t[0]=o+r*(e[0]-o),t[1]=i+r*(e[1]-i),t[2]=u+r*(e[2]-u),t[3]=a+r*(e[3]-a),t}function S(t,n){var e,o,i,u,a,c;n=n||1;do{a=(e=2*r.RANDOM()-1)*e+(o=2*r.RANDOM()-1)*o;}while(a>=1);do{c=(i=2*r.RANDOM()-1)*i+(u=2*r.RANDOM()-1)*u;}while(c>=1);var s=Math.sqrt((1-a)/c);return t[0]=n*e,t[1]=n*o,t[2]=n*i*s,t[3]=n*u*s,t}function T(t,n,e){var r=n[0],o=n[1],i=n[2],u=n[3];return t[0]=e[0]*r+e[4]*o+e[8]*i+e[12]*u,t[1]=e[1]*r+e[5]*o+e[9]*i+e[13]*u,t[2]=e[2]*r+e[6]*o+e[10]*i+e[14]*u,t[3]=e[3]*r+e[7]*o+e[11]*i+e[15]*u,t}function O(t,n,e){var r=n[0],o=n[1],i=n[2],u=e[0],a=e[1],c=e[2],s=e[3],l=s*r+a*i-c*o,f=s*o+c*r-u*i,h=s*i+u*o-a*r,d=-u*r-a*o-c*i;return t[0]=l*s+d*-u+f*-c-h*-a,t[1]=f*s+d*-a+h*-u-l*-c,t[2]=h*s+d*-c+l*-a-f*-u,t[3]=n[3],t}function z(t){return "vec4("+t[0]+", "+t[1]+", "+t[2]+", "+t[3]+")"}function L(t,n){return t[0]===n[0]&&t[1]===n[1]&&t[2]===n[2]&&t[3]===n[3]}function N(t,n){var e=t[0],o=t[1],i=t[2],u=t[3],a=n[0],c=n[1],s=n[2],l=n[3];return Math.abs(e-a)<=r.EPSILON*Math.max(1,Math.abs(e),Math.abs(a))&&Math.abs(o-c)<=r.EPSILON*Math.max(1,Math.abs(o),Math.abs(c))&&Math.abs(i-s)<=r.EPSILON*Math.max(1,Math.abs(i),Math.abs(s))&&Math.abs(u-l)<=r.EPSILON*Math.max(1,Math.abs(u),Math.abs(l))}var C,R=l,k=f,D=h,V=y,B=b,q=w,Y=M,U=(C=o(),function(t,n,e,r,o,i){var u=void 0,a=void 0;for(n||(n=4),e||(e=0),a=r?Math.min(r*n+e,t.length):t.length,u=e;u<a;u+=n)C[0]=t[u],C[1]=t[u+1],C[2]=t[u+2],C[3]=t[u+3],o(C,C,i),t[u]=C[0],t[u+1]=C[1],t[u+2]=C[2],t[u+3]=C[3];return t});},"./node_modules/lodash/lodash.js":function(t,n,e){(function(t,r){var o;(function(){var i,u=200,a="Unsupported core-js use. Try https://npms.io/search?q=ponyfill.",c="Expected a function",s="__lodash_hash_undefined__",l=500,f="__lodash_placeholder__",h=1,d=2,p=4,g=1,v=2,m=1,x=2,_=4,y=8,b=16,w=32,M=64,A=128,j=256,E=512,I=30,P="...",S=800,T=16,O=1,z=2,L=1/0,N=9007199254740991,C=1.7976931348623157e308,R=NaN,k=4294967295,D=k-1,V=k>>>1,B=[["ary",A],["bind",m],["bindKey",x],["curry",y],["curryRight",b],["flip",E],["partial",w],["partialRight",M],["rearg",j]],q="[object Arguments]",Y="[object Array]",U="[object AsyncFunction]",F="[object Boolean]",X="[object Date]",G="[object DOMException]",Z="[object Error]",W="[object Function]",H="[object GeneratorFunction]",$="[object Map]",K="[object Number]",Q="[object Null]",J="[object Object]",tt="[object Proxy]",nt="[object RegExp]",et="[object Set]",rt="[object String]",ot="[object Symbol]",it="[object Undefined]",ut="[object WeakMap]",at="[object WeakSet]",ct="[object ArrayBuffer]",st="[object DataView]",lt="[object Float32Array]",ft="[object Float64Array]",ht="[object Int8Array]",dt="[object Int16Array]",pt="[object Int32Array]",gt="[object Uint8Array]",vt="[object Uint8ClampedArray]",mt="[object Uint16Array]",xt="[object Uint32Array]",_t=/\b__p \+= '';/g,yt=/\b(__p \+=) '' \+/g,bt=/(__e\(.*?\)|\b__t\)) \+\n'';/g,wt=/&(?:amp|lt|gt|quot|#39);/g,Mt=/[&<>"']/g,At=RegExp(wt.source),jt=RegExp(Mt.source),Et=/<%-([\s\S]+?)%>/g,It=/<%([\s\S]+?)%>/g,Pt=/<%=([\s\S]+?)%>/g,St=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,Tt=/^\w*$/,Ot=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,zt=/[\\^$.*+?()[\]{}|]/g,Lt=RegExp(zt.source),Nt=/^\s+|\s+$/g,Ct=/^\s+/,Rt=/\s+$/,kt=/\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/,Dt=/\{\n\/\* \[wrapped with (.+)\] \*/,Vt=/,? & /,Bt=/[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g,qt=/\\(\\)?/g,Yt=/\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,Ut=/\w*$/,Ft=/^[-+]0x[0-9a-f]+$/i,Xt=/^0b[01]+$/i,Gt=/^\[object .+?Constructor\]$/,Zt=/^0o[0-7]+$/i,Wt=/^(?:0|[1-9]\d*)$/,Ht=/[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g,$t=/($^)/,Kt=/['\n\r\u2028\u2029\\]/g,Qt="\\u0300-\\u036f\\ufe20-\\ufe2f\\u20d0-\\u20ff",Jt="\\xac\\xb1\\xd7\\xf7\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf\\u2000-\\u206f \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000",tn="[\\ud800-\\udfff]",nn="["+Jt+"]",en="["+Qt+"]",rn="\\d+",on="[\\u2700-\\u27bf]",un="[a-z\\xdf-\\xf6\\xf8-\\xff]",an="[^\\ud800-\\udfff"+Jt+rn+"\\u2700-\\u27bfa-z\\xdf-\\xf6\\xf8-\\xffA-Z\\xc0-\\xd6\\xd8-\\xde]",cn="\\ud83c[\\udffb-\\udfff]",sn="[^\\ud800-\\udfff]",ln="(?:\\ud83c[\\udde6-\\uddff]){2}",fn="[\\ud800-\\udbff][\\udc00-\\udfff]",hn="[A-Z\\xc0-\\xd6\\xd8-\\xde]",dn="(?:"+un+"|"+an+")",pn="(?:"+hn+"|"+an+")",gn="(?:"+en+"|"+cn+")"+"?",vn="[\\ufe0e\\ufe0f]?"+gn+("(?:\\u200d(?:"+[sn,ln,fn].join("|")+")[\\ufe0e\\ufe0f]?"+gn+")*"),mn="(?:"+[on,ln,fn].join("|")+")"+vn,xn="(?:"+[sn+en+"?",en,ln,fn,tn].join("|")+")",_n=RegExp("['’]","g"),yn=RegExp(en,"g"),bn=RegExp(cn+"(?="+cn+")|"+xn+vn,"g"),wn=RegExp([hn+"?"+un+"+(?:['’](?:d|ll|m|re|s|t|ve))?(?="+[nn,hn,"$"].join("|")+")",pn+"+(?:['’](?:D|LL|M|RE|S|T|VE))?(?="+[nn,hn+dn,"$"].join("|")+")",hn+"?"+dn+"+(?:['’](?:d|ll|m|re|s|t|ve))?",hn+"+(?:['’](?:D|LL|M|RE|S|T|VE))?","\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])","\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])",rn,mn].join("|"),"g"),Mn=RegExp("[\\u200d\\ud800-\\udfff"+Qt+"\\ufe0e\\ufe0f]"),An=/[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/,jn=["Array","Buffer","DataView","Date","Error","Float32Array","Float64Array","Function","Int8Array","Int16Array","Int32Array","Map","Math","Object","Promise","RegExp","Set","String","Symbol","TypeError","Uint8Array","Uint8ClampedArray","Uint16Array","Uint32Array","WeakMap","_","clearTimeout","isFinite","parseInt","setTimeout"],En=-1,In={};In[lt]=In[ft]=In[ht]=In[dt]=In[pt]=In[gt]=In[vt]=In[mt]=In[xt]=!0,In[q]=In[Y]=In[ct]=In[F]=In[st]=In[X]=In[Z]=In[W]=In[$]=In[K]=In[J]=In[nt]=In[et]=In[rt]=In[ut]=!1;var Pn={};Pn[q]=Pn[Y]=Pn[ct]=Pn[st]=Pn[F]=Pn[X]=Pn[lt]=Pn[ft]=Pn[ht]=Pn[dt]=Pn[pt]=Pn[$]=Pn[K]=Pn[J]=Pn[nt]=Pn[et]=Pn[rt]=Pn[ot]=Pn[gt]=Pn[vt]=Pn[mt]=Pn[xt]=!0,Pn[Z]=Pn[W]=Pn[ut]=!1;var Sn={"\\":"\\","'":"'","\n":"n","\r":"r","\u2028":"u2028","\u2029":"u2029"},Tn=parseFloat,On=parseInt,zn="object"==typeof t&&t&&t.Object===Object&&t,Ln="object"==typeof self&&self&&self.Object===Object&&self,Nn=zn||Ln||Function("return this")(),Cn=n&&!n.nodeType&&n,Rn=Cn&&"object"==typeof r&&r&&!r.nodeType&&r,kn=Rn&&Rn.exports===Cn,Dn=kn&&zn.process,Vn=function(){try{var t=Rn&&Rn.require&&Rn.require("util").types;return t||Dn&&Dn.binding&&Dn.binding("util")}catch(t){}}(),Bn=Vn&&Vn.isArrayBuffer,qn=Vn&&Vn.isDate,Yn=Vn&&Vn.isMap,Un=Vn&&Vn.isRegExp,Fn=Vn&&Vn.isSet,Xn=Vn&&Vn.isTypedArray;function Gn(t,n,e){switch(e.length){case 0:return t.call(n);case 1:return t.call(n,e[0]);case 2:return t.call(n,e[0],e[1]);case 3:return t.call(n,e[0],e[1],e[2])}return t.apply(n,e)}function Zn(t,n,e,r){for(var o=-1,i=null==t?0:t.length;++o<i;){var u=t[o];n(r,u,e(u),t);}return r}function Wn(t,n){for(var e=-1,r=null==t?0:t.length;++e<r&&!1!==n(t[e],e,t););return t}function Hn(t,n){for(var e=null==t?0:t.length;e--&&!1!==n(t[e],e,t););return t}function $n(t,n){for(var e=-1,r=null==t?0:t.length;++e<r;)if(!n(t[e],e,t))return !1;return !0}function Kn(t,n){for(var e=-1,r=null==t?0:t.length,o=0,i=[];++e<r;){var u=t[e];n(u,e,t)&&(i[o++]=u);}return i}function Qn(t,n){return !!(null==t?0:t.length)&&ce(t,n,0)>-1}function Jn(t,n,e){for(var r=-1,o=null==t?0:t.length;++r<o;)if(e(n,t[r]))return !0;return !1}function te(t,n){for(var e=-1,r=null==t?0:t.length,o=Array(r);++e<r;)o[e]=n(t[e],e,t);return o}function ne(t,n){for(var e=-1,r=n.length,o=t.length;++e<r;)t[o+e]=n[e];return t}function ee(t,n,e,r){var o=-1,i=null==t?0:t.length;for(r&&i&&(e=t[++o]);++o<i;)e=n(e,t[o],o,t);return e}function re(t,n,e,r){var o=null==t?0:t.length;for(r&&o&&(e=t[--o]);o--;)e=n(e,t[o],o,t);return e}function oe(t,n){for(var e=-1,r=null==t?0:t.length;++e<r;)if(n(t[e],e,t))return !0;return !1}var ie=he("length");function ue(t,n,e){var r;return e(t,function(t,e,o){if(n(t,e,o))return r=e,!1}),r}function ae(t,n,e,r){for(var o=t.length,i=e+(r?1:-1);r?i--:++i<o;)if(n(t[i],i,t))return i;return -1}function ce(t,n,e){return n==n?function(t,n,e){var r=e-1,o=t.length;for(;++r<o;)if(t[r]===n)return r;return -1}(t,n,e):ae(t,le,e)}function se(t,n,e,r){for(var o=e-1,i=t.length;++o<i;)if(r(t[o],n))return o;return -1}function le(t){return t!=t}function fe(t,n){var e=null==t?0:t.length;return e?ge(t,n)/e:R}function he(t){return function(n){return null==n?i:n[t]}}function de(t){return function(n){return null==t?i:t[n]}}function pe(t,n,e,r,o){return o(t,function(t,o,i){e=r?(r=!1,t):n(e,t,o,i);}),e}function ge(t,n){for(var e,r=-1,o=t.length;++r<o;){var u=n(t[r]);u!==i&&(e=e===i?u:e+u);}return e}function ve(t,n){for(var e=-1,r=Array(t);++e<t;)r[e]=n(e);return r}function me(t){return function(n){return t(n)}}function xe(t,n){return te(n,function(n){return t[n]})}function _e(t,n){return t.has(n)}function ye(t,n){for(var e=-1,r=t.length;++e<r&&ce(n,t[e],0)>-1;);return e}function be(t,n){for(var e=t.length;e--&&ce(n,t[e],0)>-1;);return e}var we=de({"À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","Ç":"C","ç":"c","Ð":"D","ð":"d","È":"E","É":"E","Ê":"E","Ë":"E","è":"e","é":"e","ê":"e","ë":"e","Ì":"I","Í":"I","Î":"I","Ï":"I","ì":"i","í":"i","î":"i","ï":"i","Ñ":"N","ñ":"n","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","Ù":"U","Ú":"U","Û":"U","Ü":"U","ù":"u","ú":"u","û":"u","ü":"u","Ý":"Y","ý":"y","ÿ":"y","Æ":"Ae","æ":"ae","Þ":"Th","þ":"th","ß":"ss","Ā":"A","Ă":"A","Ą":"A","ā":"a","ă":"a","ą":"a","Ć":"C","Ĉ":"C","Ċ":"C","Č":"C","ć":"c","ĉ":"c","ċ":"c","č":"c","Ď":"D","Đ":"D","ď":"d","đ":"d","Ē":"E","Ĕ":"E","Ė":"E","Ę":"E","Ě":"E","ē":"e","ĕ":"e","ė":"e","ę":"e","ě":"e","Ĝ":"G","Ğ":"G","Ġ":"G","Ģ":"G","ĝ":"g","ğ":"g","ġ":"g","ģ":"g","Ĥ":"H","Ħ":"H","ĥ":"h","ħ":"h","Ĩ":"I","Ī":"I","Ĭ":"I","Į":"I","İ":"I","ĩ":"i","ī":"i","ĭ":"i","į":"i","ı":"i","Ĵ":"J","ĵ":"j","Ķ":"K","ķ":"k","ĸ":"k","Ĺ":"L","Ļ":"L","Ľ":"L","Ŀ":"L","Ł":"L","ĺ":"l","ļ":"l","ľ":"l","ŀ":"l","ł":"l","Ń":"N","Ņ":"N","Ň":"N","Ŋ":"N","ń":"n","ņ":"n","ň":"n","ŋ":"n","Ō":"O","Ŏ":"O","Ő":"O","ō":"o","ŏ":"o","ő":"o","Ŕ":"R","Ŗ":"R","Ř":"R","ŕ":"r","ŗ":"r","ř":"r","Ś":"S","Ŝ":"S","Ş":"S","Š":"S","ś":"s","ŝ":"s","ş":"s","š":"s","Ţ":"T","Ť":"T","Ŧ":"T","ţ":"t","ť":"t","ŧ":"t","Ũ":"U","Ū":"U","Ŭ":"U","Ů":"U","Ű":"U","Ų":"U","ũ":"u","ū":"u","ŭ":"u","ů":"u","ű":"u","ų":"u","Ŵ":"W","ŵ":"w","Ŷ":"Y","ŷ":"y","Ÿ":"Y","Ź":"Z","Ż":"Z","Ž":"Z","ź":"z","ż":"z","ž":"z","Ĳ":"IJ","ĳ":"ij","Œ":"Oe","œ":"oe","ŉ":"'n","ſ":"s"}),Me=de({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"});function Ae(t){return "\\"+Sn[t]}function je(t){return Mn.test(t)}function Ee(t){var n=-1,e=Array(t.size);return t.forEach(function(t,r){e[++n]=[r,t];}),e}function Ie(t,n){return function(e){return t(n(e))}}function Pe(t,n){for(var e=-1,r=t.length,o=0,i=[];++e<r;){var u=t[e];u!==n&&u!==f||(t[e]=f,i[o++]=e);}return i}function Se(t){var n=-1,e=Array(t.size);return t.forEach(function(t){e[++n]=t;}),e}function Te(t){var n=-1,e=Array(t.size);return t.forEach(function(t){e[++n]=[t,t];}),e}function Oe(t){return je(t)?function(t){var n=bn.lastIndex=0;for(;bn.test(t);)++n;return n}(t):ie(t)}function ze(t){return je(t)?function(t){return t.match(bn)||[]}(t):function(t){return t.split("")}(t)}var Le=de({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&#39;":"'"});var Ne=function t(n){var e,r=(n=null==n?Nn:Ne.defaults(Nn.Object(),n,Ne.pick(Nn,jn))).Array,o=n.Date,Qt=n.Error,Jt=n.Function,tn=n.Math,nn=n.Object,en=n.RegExp,rn=n.String,on=n.TypeError,un=r.prototype,an=Jt.prototype,cn=nn.prototype,sn=n["__core-js_shared__"],ln=an.toString,fn=cn.hasOwnProperty,hn=0,dn=(e=/[^.]+$/.exec(sn&&sn.keys&&sn.keys.IE_PROTO||""))?"Symbol(src)_1."+e:"",pn=cn.toString,gn=ln.call(nn),vn=Nn._,mn=en("^"+ln.call(fn).replace(zt,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),xn=kn?n.Buffer:i,bn=n.Symbol,Mn=n.Uint8Array,Sn=xn?xn.allocUnsafe:i,zn=Ie(nn.getPrototypeOf,nn),Ln=nn.create,Cn=cn.propertyIsEnumerable,Rn=un.splice,Dn=bn?bn.isConcatSpreadable:i,Vn=bn?bn.iterator:i,ie=bn?bn.toStringTag:i,de=function(){try{var t=Vi(nn,"defineProperty");return t({},"",{}),t}catch(t){}}(),Ce=n.clearTimeout!==Nn.clearTimeout&&n.clearTimeout,Re=o&&o.now!==Nn.Date.now&&o.now,ke=n.setTimeout!==Nn.setTimeout&&n.setTimeout,De=tn.ceil,Ve=tn.floor,Be=nn.getOwnPropertySymbols,qe=xn?xn.isBuffer:i,Ye=n.isFinite,Ue=un.join,Fe=Ie(nn.keys,nn),Xe=tn.max,Ge=tn.min,Ze=o.now,We=n.parseInt,He=tn.random,$e=un.reverse,Ke=Vi(n,"DataView"),Qe=Vi(n,"Map"),Je=Vi(n,"Promise"),tr=Vi(n,"Set"),nr=Vi(n,"WeakMap"),er=Vi(nn,"create"),rr=nr&&new nr,or={},ir=fu(Ke),ur=fu(Qe),ar=fu(Je),cr=fu(tr),sr=fu(nr),lr=bn?bn.prototype:i,fr=lr?lr.valueOf:i,hr=lr?lr.toString:i;function dr(t){if(Pa(t)&&!ma(t)&&!(t instanceof mr)){if(t instanceof vr)return t;if(fn.call(t,"__wrapped__"))return hu(t)}return new vr(t)}var pr=function(){function t(){}return function(n){if(!Ia(n))return {};if(Ln)return Ln(n);t.prototype=n;var e=new t;return t.prototype=i,e}}();function gr(){}function vr(t,n){this.__wrapped__=t,this.__actions__=[],this.__chain__=!!n,this.__index__=0,this.__values__=i;}function mr(t){this.__wrapped__=t,this.__actions__=[],this.__dir__=1,this.__filtered__=!1,this.__iteratees__=[],this.__takeCount__=k,this.__views__=[];}function xr(t){var n=-1,e=null==t?0:t.length;for(this.clear();++n<e;){var r=t[n];this.set(r[0],r[1]);}}function _r(t){var n=-1,e=null==t?0:t.length;for(this.clear();++n<e;){var r=t[n];this.set(r[0],r[1]);}}function yr(t){var n=-1,e=null==t?0:t.length;for(this.clear();++n<e;){var r=t[n];this.set(r[0],r[1]);}}function br(t){var n=-1,e=null==t?0:t.length;for(this.__data__=new yr;++n<e;)this.add(t[n]);}function wr(t){var n=this.__data__=new _r(t);this.size=n.size;}function Mr(t,n){var e=ma(t),r=!e&&va(t),o=!e&&!r&&ba(t),i=!e&&!r&&!o&&Ra(t),u=e||r||o||i,a=u?ve(t.length,rn):[],c=a.length;for(var s in t)!n&&!fn.call(t,s)||u&&("length"==s||o&&("offset"==s||"parent"==s)||i&&("buffer"==s||"byteLength"==s||"byteOffset"==s)||Gi(s,c))||a.push(s);return a}function Ar(t){var n=t.length;return n?t[wo(0,n-1)]:i}function jr(t,n){return cu(ri(t),Nr(n,0,t.length))}function Er(t){return cu(ri(t))}function Ir(t,n,e){(e===i||da(t[n],e))&&(e!==i||n in t)||zr(t,n,e);}function Pr(t,n,e){var r=t[n];fn.call(t,n)&&da(r,e)&&(e!==i||n in t)||zr(t,n,e);}function Sr(t,n){for(var e=t.length;e--;)if(da(t[e][0],n))return e;return -1}function Tr(t,n,e,r){return Vr(t,function(t,o,i){n(r,t,e(t),i);}),r}function Or(t,n){return t&&oi(n,oc(n),t)}function zr(t,n,e){"__proto__"==n&&de?de(t,n,{configurable:!0,enumerable:!0,value:e,writable:!0}):t[n]=e;}function Lr(t,n){for(var e=-1,o=n.length,u=r(o),a=null==t;++e<o;)u[e]=a?i:Ja(t,n[e]);return u}function Nr(t,n,e){return t==t&&(e!==i&&(t=t<=e?t:e),n!==i&&(t=t>=n?t:n)),t}function Cr(t,n,e,r,o,u){var a,c=n&h,s=n&d,l=n&p;if(e&&(a=o?e(t,r,o,u):e(t)),a!==i)return a;if(!Ia(t))return t;var f=ma(t);if(f){if(a=function(t){var n=t.length,e=new t.constructor(n);return n&&"string"==typeof t[0]&&fn.call(t,"index")&&(e.index=t.index,e.input=t.input),e}(t),!c)return ri(t,a)}else {var g=Yi(t),v=g==W||g==H;if(ba(t))return Ko(t,c);if(g==J||g==q||v&&!o){if(a=s||v?{}:Fi(t),!c)return s?function(t,n){return oi(t,qi(t),n)}(t,function(t,n){return t&&oi(n,ic(n),t)}(a,t)):function(t,n){return oi(t,Bi(t),n)}(t,Or(a,t))}else {if(!Pn[g])return o?t:{};a=function(t,n,e){var r,o,i,u=t.constructor;switch(n){case ct:return Qo(t);case F:case X:return new u(+t);case st:return function(t,n){var e=n?Qo(t.buffer):t.buffer;return new t.constructor(e,t.byteOffset,t.byteLength)}(t,e);case lt:case ft:case ht:case dt:case pt:case gt:case vt:case mt:case xt:return Jo(t,e);case $:return new u;case K:case rt:return new u(t);case nt:return (i=new(o=t).constructor(o.source,Ut.exec(o))).lastIndex=o.lastIndex,i;case et:return new u;case ot:return r=t,fr?nn(fr.call(r)):{}}}(t,g,c);}}u||(u=new wr);var m=u.get(t);if(m)return m;if(u.set(t,a),La(t))return t.forEach(function(r){a.add(Cr(r,n,e,r,t,u));}),a;if(Sa(t))return t.forEach(function(r,o){a.set(o,Cr(r,n,e,o,t,u));}),a;var x=f?i:(l?s?zi:Oi:s?ic:oc)(t);return Wn(x||t,function(r,o){x&&(r=t[o=r]),Pr(a,o,Cr(r,n,e,o,t,u));}),a}function Rr(t,n,e){var r=e.length;if(null==t)return !r;for(t=nn(t);r--;){var o=e[r],u=n[o],a=t[o];if(a===i&&!(o in t)||!u(a))return !1}return !0}function kr(t,n,e){if("function"!=typeof t)throw new on(c);return ou(function(){t.apply(i,e);},n)}function Dr(t,n,e,r){var o=-1,i=Qn,a=!0,c=t.length,s=[],l=n.length;if(!c)return s;e&&(n=te(n,me(e))),r?(i=Jn,a=!1):n.length>=u&&(i=_e,a=!1,n=new br(n));t:for(;++o<c;){var f=t[o],h=null==e?f:e(f);if(f=r||0!==f?f:0,a&&h==h){for(var d=l;d--;)if(n[d]===h)continue t;s.push(f);}else i(n,h,r)||s.push(f);}return s}dr.templateSettings={escape:Et,evaluate:It,interpolate:Pt,variable:"",imports:{_:dr}},dr.prototype=gr.prototype,dr.prototype.constructor=dr,vr.prototype=pr(gr.prototype),vr.prototype.constructor=vr,mr.prototype=pr(gr.prototype),mr.prototype.constructor=mr,xr.prototype.clear=function(){this.__data__=er?er(null):{},this.size=0;},xr.prototype.delete=function(t){var n=this.has(t)&&delete this.__data__[t];return this.size-=n?1:0,n},xr.prototype.get=function(t){var n=this.__data__;if(er){var e=n[t];return e===s?i:e}return fn.call(n,t)?n[t]:i},xr.prototype.has=function(t){var n=this.__data__;return er?n[t]!==i:fn.call(n,t)},xr.prototype.set=function(t,n){var e=this.__data__;return this.size+=this.has(t)?0:1,e[t]=er&&n===i?s:n,this},_r.prototype.clear=function(){this.__data__=[],this.size=0;},_r.prototype.delete=function(t){var n=this.__data__,e=Sr(n,t);return !(e<0||(e==n.length-1?n.pop():Rn.call(n,e,1),--this.size,0))},_r.prototype.get=function(t){var n=this.__data__,e=Sr(n,t);return e<0?i:n[e][1]},_r.prototype.has=function(t){return Sr(this.__data__,t)>-1},_r.prototype.set=function(t,n){var e=this.__data__,r=Sr(e,t);return r<0?(++this.size,e.push([t,n])):e[r][1]=n,this},yr.prototype.clear=function(){this.size=0,this.__data__={hash:new xr,map:new(Qe||_r),string:new xr};},yr.prototype.delete=function(t){var n=ki(this,t).delete(t);return this.size-=n?1:0,n},yr.prototype.get=function(t){return ki(this,t).get(t)},yr.prototype.has=function(t){return ki(this,t).has(t)},yr.prototype.set=function(t,n){var e=ki(this,t),r=e.size;return e.set(t,n),this.size+=e.size==r?0:1,this},br.prototype.add=br.prototype.push=function(t){return this.__data__.set(t,s),this},br.prototype.has=function(t){return this.__data__.has(t)},wr.prototype.clear=function(){this.__data__=new _r,this.size=0;},wr.prototype.delete=function(t){var n=this.__data__,e=n.delete(t);return this.size=n.size,e},wr.prototype.get=function(t){return this.__data__.get(t)},wr.prototype.has=function(t){return this.__data__.has(t)},wr.prototype.set=function(t,n){var e=this.__data__;if(e instanceof _r){var r=e.__data__;if(!Qe||r.length<u-1)return r.push([t,n]),this.size=++e.size,this;e=this.__data__=new yr(r);}return e.set(t,n),this.size=e.size,this};var Vr=ai(Zr),Br=ai(Wr,!0);function qr(t,n){var e=!0;return Vr(t,function(t,r,o){return e=!!n(t,r,o)}),e}function Yr(t,n,e){for(var r=-1,o=t.length;++r<o;){var u=t[r],a=n(u);if(null!=a&&(c===i?a==a&&!Ca(a):e(a,c)))var c=a,s=u;}return s}function Ur(t,n){var e=[];return Vr(t,function(t,r,o){n(t,r,o)&&e.push(t);}),e}function Fr(t,n,e,r,o){var i=-1,u=t.length;for(e||(e=Xi),o||(o=[]);++i<u;){var a=t[i];n>0&&e(a)?n>1?Fr(a,n-1,e,r,o):ne(o,a):r||(o[o.length]=a);}return o}var Xr=ci(),Gr=ci(!0);function Zr(t,n){return t&&Xr(t,n,oc)}function Wr(t,n){return t&&Gr(t,n,oc)}function Hr(t,n){return Kn(n,function(n){return Aa(t[n])})}function $r(t,n){for(var e=0,r=(n=Zo(n,t)).length;null!=t&&e<r;)t=t[lu(n[e++])];return e&&e==r?t:i}function Kr(t,n,e){var r=n(t);return ma(t)?r:ne(r,e(t))}function Qr(t){return null==t?t===i?it:Q:ie&&ie in nn(t)?function(t){var n=fn.call(t,ie),e=t[ie];try{t[ie]=i;var r=!0;}catch(t){}var o=pn.call(t);return r&&(n?t[ie]=e:delete t[ie]),o}(t):function(t){return pn.call(t)}(t)}function Jr(t,n){return t>n}function to(t,n){return null!=t&&fn.call(t,n)}function no(t,n){return null!=t&&n in nn(t)}function eo(t,n,e){for(var o=e?Jn:Qn,u=t[0].length,a=t.length,c=a,s=r(a),l=1/0,f=[];c--;){var h=t[c];c&&n&&(h=te(h,me(n))),l=Ge(h.length,l),s[c]=!e&&(n||u>=120&&h.length>=120)?new br(c&&h):i;}h=t[0];var d=-1,p=s[0];t:for(;++d<u&&f.length<l;){var g=h[d],v=n?n(g):g;if(g=e||0!==g?g:0,!(p?_e(p,v):o(f,v,e))){for(c=a;--c;){var m=s[c];if(!(m?_e(m,v):o(t[c],v,e)))continue t}p&&p.push(v),f.push(g);}}return f}function ro(t,n,e){var r=null==(t=nu(t,n=Zo(n,t)))?t:t[lu(Mu(n))];return null==r?i:Gn(r,t,e)}function oo(t){return Pa(t)&&Qr(t)==q}function io(t,n,e,r,o){return t===n||(null==t||null==n||!Pa(t)&&!Pa(n)?t!=t&&n!=n:function(t,n,e,r,o,u){var a=ma(t),c=ma(n),s=a?Y:Yi(t),l=c?Y:Yi(n),f=(s=s==q?J:s)==J,h=(l=l==q?J:l)==J,d=s==l;if(d&&ba(t)){if(!ba(n))return !1;a=!0,f=!1;}if(d&&!f)return u||(u=new wr),a||Ra(t)?Si(t,n,e,r,o,u):function(t,n,e,r,o,i,u){switch(e){case st:if(t.byteLength!=n.byteLength||t.byteOffset!=n.byteOffset)return !1;t=t.buffer,n=n.buffer;case ct:return !(t.byteLength!=n.byteLength||!i(new Mn(t),new Mn(n)));case F:case X:case K:return da(+t,+n);case Z:return t.name==n.name&&t.message==n.message;case nt:case rt:return t==n+"";case $:var a=Ee;case et:var c=r&g;if(a||(a=Se),t.size!=n.size&&!c)return !1;var s=u.get(t);if(s)return s==n;r|=v,u.set(t,n);var l=Si(a(t),a(n),r,o,i,u);return u.delete(t),l;case ot:if(fr)return fr.call(t)==fr.call(n)}return !1}(t,n,s,e,r,o,u);if(!(e&g)){var p=f&&fn.call(t,"__wrapped__"),m=h&&fn.call(n,"__wrapped__");if(p||m){var x=p?t.value():t,_=m?n.value():n;return u||(u=new wr),o(x,_,e,r,u)}}return !!d&&(u||(u=new wr),function(t,n,e,r,o,u){var a=e&g,c=Oi(t),s=c.length,l=Oi(n).length;if(s!=l&&!a)return !1;for(var f=s;f--;){var h=c[f];if(!(a?h in n:fn.call(n,h)))return !1}var d=u.get(t);if(d&&u.get(n))return d==n;var p=!0;u.set(t,n),u.set(n,t);for(var v=a;++f<s;){h=c[f];var m=t[h],x=n[h];if(r)var _=a?r(x,m,h,n,t,u):r(m,x,h,t,n,u);if(!(_===i?m===x||o(m,x,e,r,u):_)){p=!1;break}v||(v="constructor"==h);}if(p&&!v){var y=t.constructor,b=n.constructor;y!=b&&"constructor"in t&&"constructor"in n&&!("function"==typeof y&&y instanceof y&&"function"==typeof b&&b instanceof b)&&(p=!1);}return u.delete(t),u.delete(n),p}(t,n,e,r,o,u))}(t,n,e,r,io,o))}function uo(t,n,e,r){var o=e.length,u=o,a=!r;if(null==t)return !u;for(t=nn(t);o--;){var c=e[o];if(a&&c[2]?c[1]!==t[c[0]]:!(c[0]in t))return !1}for(;++o<u;){var s=(c=e[o])[0],l=t[s],f=c[1];if(a&&c[2]){if(l===i&&!(s in t))return !1}else {var h=new wr;if(r)var d=r(l,f,s,t,n,h);if(!(d===i?io(f,l,g|v,r,h):d))return !1}}return !0}function ao(t){return !(!Ia(t)||dn&&dn in t)&&(Aa(t)?mn:Gt).test(fu(t))}function co(t){return "function"==typeof t?t:null==t?Tc:"object"==typeof t?ma(t)?go(t[0],t[1]):po(t):Vc(t)}function so(t){if(!Ki(t))return Fe(t);var n=[];for(var e in nn(t))fn.call(t,e)&&"constructor"!=e&&n.push(e);return n}function lo(t){if(!Ia(t))return function(t){var n=[];if(null!=t)for(var e in nn(t))n.push(e);return n}(t);var n=Ki(t),e=[];for(var r in t)("constructor"!=r||!n&&fn.call(t,r))&&e.push(r);return e}function fo(t,n){return t<n}function ho(t,n){var e=-1,o=_a(t)?r(t.length):[];return Vr(t,function(t,r,i){o[++e]=n(t,r,i);}),o}function po(t){var n=Di(t);return 1==n.length&&n[0][2]?Ji(n[0][0],n[0][1]):function(e){return e===t||uo(e,t,n)}}function go(t,n){return Wi(t)&&Qi(n)?Ji(lu(t),n):function(e){var r=Ja(e,t);return r===i&&r===n?tc(e,t):io(n,r,g|v)}}function vo(t,n,e,r,o){t!==n&&Xr(n,function(u,a){if(Ia(u))o||(o=new wr),function(t,n,e,r,o,u,a){var c=eu(t,e),s=eu(n,e),l=a.get(s);if(l)Ir(t,e,l);else {var f=u?u(c,s,e+"",t,n,a):i,h=f===i;if(h){var d=ma(s),p=!d&&ba(s),g=!d&&!p&&Ra(s);f=s,d||p||g?ma(c)?f=c:ya(c)?f=ri(c):p?(h=!1,f=Ko(s,!0)):g?(h=!1,f=Jo(s,!0)):f=[]:Oa(s)||va(s)?(f=c,va(c)?f=Fa(c):Ia(c)&&!Aa(c)||(f=Fi(s))):h=!1;}h&&(a.set(s,f),o(f,s,r,u,a),a.delete(s)),Ir(t,e,f);}}(t,n,a,e,vo,r,o);else {var c=r?r(eu(t,a),u,a+"",t,n,o):i;c===i&&(c=u),Ir(t,a,c);}},ic);}function mo(t,n){var e=t.length;if(e)return Gi(n+=n<0?e:0,e)?t[n]:i}function xo(t,n,e){var r=-1;return n=te(n.length?n:[Tc],me(Ri())),function(t,n){var e=t.length;for(t.sort(n);e--;)t[e]=t[e].value;return t}(ho(t,function(t,e,o){return {criteria:te(n,function(n){return n(t)}),index:++r,value:t}}),function(t,n){return function(t,n,e){for(var r=-1,o=t.criteria,i=n.criteria,u=o.length,a=e.length;++r<u;){var c=ti(o[r],i[r]);if(c){if(r>=a)return c;var s=e[r];return c*("desc"==s?-1:1)}}return t.index-n.index}(t,n,e)})}function _o(t,n,e){for(var r=-1,o=n.length,i={};++r<o;){var u=n[r],a=$r(t,u);e(a,u)&&Io(i,Zo(u,t),a);}return i}function yo(t,n,e,r){var o=r?se:ce,i=-1,u=n.length,a=t;for(t===n&&(n=ri(n)),e&&(a=te(t,me(e)));++i<u;)for(var c=0,s=n[i],l=e?e(s):s;(c=o(a,l,c,r))>-1;)a!==t&&Rn.call(a,c,1),Rn.call(t,c,1);return t}function bo(t,n){for(var e=t?n.length:0,r=e-1;e--;){var o=n[e];if(e==r||o!==i){var i=o;Gi(o)?Rn.call(t,o,1):Vo(t,o);}}return t}function wo(t,n){return t+Ve(He()*(n-t+1))}function Mo(t,n){var e="";if(!t||n<1||n>N)return e;do{n%2&&(e+=t),(n=Ve(n/2))&&(t+=t);}while(n);return e}function Ao(t,n){return iu(tu(t,n,Tc),t+"")}function jo(t){return Ar(dc(t))}function Eo(t,n){var e=dc(t);return cu(e,Nr(n,0,e.length))}function Io(t,n,e,r){if(!Ia(t))return t;for(var o=-1,u=(n=Zo(n,t)).length,a=u-1,c=t;null!=c&&++o<u;){var s=lu(n[o]),l=e;if(o!=a){var f=c[s];(l=r?r(f,s,c):i)===i&&(l=Ia(f)?f:Gi(n[o+1])?[]:{});}Pr(c,s,l),c=c[s];}return t}var Po=rr?function(t,n){return rr.set(t,n),t}:Tc,So=de?function(t,n){return de(t,"toString",{configurable:!0,enumerable:!1,value:Ic(n),writable:!0})}:Tc;function To(t){return cu(dc(t))}function Oo(t,n,e){var o=-1,i=t.length;n<0&&(n=-n>i?0:i+n),(e=e>i?i:e)<0&&(e+=i),i=n>e?0:e-n>>>0,n>>>=0;for(var u=r(i);++o<i;)u[o]=t[o+n];return u}function zo(t,n){var e;return Vr(t,function(t,r,o){return !(e=n(t,r,o))}),!!e}function Lo(t,n,e){var r=0,o=null==t?r:t.length;if("number"==typeof n&&n==n&&o<=V){for(;r<o;){var i=r+o>>>1,u=t[i];null!==u&&!Ca(u)&&(e?u<=n:u<n)?r=i+1:o=i;}return o}return No(t,n,Tc,e)}function No(t,n,e,r){n=e(n);for(var o=0,u=null==t?0:t.length,a=n!=n,c=null===n,s=Ca(n),l=n===i;o<u;){var f=Ve((o+u)/2),h=e(t[f]),d=h!==i,p=null===h,g=h==h,v=Ca(h);if(a)var m=r||g;else m=l?g&&(r||d):c?g&&d&&(r||!p):s?g&&d&&!p&&(r||!v):!p&&!v&&(r?h<=n:h<n);m?o=f+1:u=f;}return Ge(u,D)}function Co(t,n){for(var e=-1,r=t.length,o=0,i=[];++e<r;){var u=t[e],a=n?n(u):u;if(!e||!da(a,c)){var c=a;i[o++]=0===u?0:u;}}return i}function Ro(t){return "number"==typeof t?t:Ca(t)?R:+t}function ko(t){if("string"==typeof t)return t;if(ma(t))return te(t,ko)+"";if(Ca(t))return hr?hr.call(t):"";var n=t+"";return "0"==n&&1/t==-L?"-0":n}function Do(t,n,e){var r=-1,o=Qn,i=t.length,a=!0,c=[],s=c;if(e)a=!1,o=Jn;else if(i>=u){var l=n?null:Mi(t);if(l)return Se(l);a=!1,o=_e,s=new br;}else s=n?[]:c;t:for(;++r<i;){var f=t[r],h=n?n(f):f;if(f=e||0!==f?f:0,a&&h==h){for(var d=s.length;d--;)if(s[d]===h)continue t;n&&s.push(h),c.push(f);}else o(s,h,e)||(s!==c&&s.push(h),c.push(f));}return c}function Vo(t,n){return null==(t=nu(t,n=Zo(n,t)))||delete t[lu(Mu(n))]}function Bo(t,n,e,r){return Io(t,n,e($r(t,n)),r)}function qo(t,n,e,r){for(var o=t.length,i=r?o:-1;(r?i--:++i<o)&&n(t[i],i,t););return e?Oo(t,r?0:i,r?i+1:o):Oo(t,r?i+1:0,r?o:i)}function Yo(t,n){var e=t;return e instanceof mr&&(e=e.value()),ee(n,function(t,n){return n.func.apply(n.thisArg,ne([t],n.args))},e)}function Uo(t,n,e){var o=t.length;if(o<2)return o?Do(t[0]):[];for(var i=-1,u=r(o);++i<o;)for(var a=t[i],c=-1;++c<o;)c!=i&&(u[i]=Dr(u[i]||a,t[c],n,e));return Do(Fr(u,1),n,e)}function Fo(t,n,e){for(var r=-1,o=t.length,u=n.length,a={};++r<o;){var c=r<u?n[r]:i;e(a,t[r],c);}return a}function Xo(t){return ya(t)?t:[]}function Go(t){return "function"==typeof t?t:Tc}function Zo(t,n){return ma(t)?t:Wi(t,n)?[t]:su(Xa(t))}var Wo=Ao;function Ho(t,n,e){var r=t.length;return e=e===i?r:e,!n&&e>=r?t:Oo(t,n,e)}var $o=Ce||function(t){return Nn.clearTimeout(t)};function Ko(t,n){if(n)return t.slice();var e=t.length,r=Sn?Sn(e):new t.constructor(e);return t.copy(r),r}function Qo(t){var n=new t.constructor(t.byteLength);return new Mn(n).set(new Mn(t)),n}function Jo(t,n){var e=n?Qo(t.buffer):t.buffer;return new t.constructor(e,t.byteOffset,t.length)}function ti(t,n){if(t!==n){var e=t!==i,r=null===t,o=t==t,u=Ca(t),a=n!==i,c=null===n,s=n==n,l=Ca(n);if(!c&&!l&&!u&&t>n||u&&a&&s&&!c&&!l||r&&a&&s||!e&&s||!o)return 1;if(!r&&!u&&!l&&t<n||l&&e&&o&&!r&&!u||c&&e&&o||!a&&o||!s)return -1}return 0}function ni(t,n,e,o){for(var i=-1,u=t.length,a=e.length,c=-1,s=n.length,l=Xe(u-a,0),f=r(s+l),h=!o;++c<s;)f[c]=n[c];for(;++i<a;)(h||i<u)&&(f[e[i]]=t[i]);for(;l--;)f[c++]=t[i++];return f}function ei(t,n,e,o){for(var i=-1,u=t.length,a=-1,c=e.length,s=-1,l=n.length,f=Xe(u-c,0),h=r(f+l),d=!o;++i<f;)h[i]=t[i];for(var p=i;++s<l;)h[p+s]=n[s];for(;++a<c;)(d||i<u)&&(h[p+e[a]]=t[i++]);return h}function ri(t,n){var e=-1,o=t.length;for(n||(n=r(o));++e<o;)n[e]=t[e];return n}function oi(t,n,e,r){var o=!e;e||(e={});for(var u=-1,a=n.length;++u<a;){var c=n[u],s=r?r(e[c],t[c],c,e,t):i;s===i&&(s=t[c]),o?zr(e,c,s):Pr(e,c,s);}return e}function ii(t,n){return function(e,r){var o=ma(e)?Zn:Tr,i=n?n():{};return o(e,t,Ri(r,2),i)}}function ui(t){return Ao(function(n,e){var r=-1,o=e.length,u=o>1?e[o-1]:i,a=o>2?e[2]:i;for(u=t.length>3&&"function"==typeof u?(o--,u):i,a&&Zi(e[0],e[1],a)&&(u=o<3?i:u,o=1),n=nn(n);++r<o;){var c=e[r];c&&t(n,c,r,u);}return n})}function ai(t,n){return function(e,r){if(null==e)return e;if(!_a(e))return t(e,r);for(var o=e.length,i=n?o:-1,u=nn(e);(n?i--:++i<o)&&!1!==r(u[i],i,u););return e}}function ci(t){return function(n,e,r){for(var o=-1,i=nn(n),u=r(n),a=u.length;a--;){var c=u[t?a:++o];if(!1===e(i[c],c,i))break}return n}}function si(t){return function(n){var e=je(n=Xa(n))?ze(n):i,r=e?e[0]:n.charAt(0),o=e?Ho(e,1).join(""):n.slice(1);return r[t]()+o}}function li(t){return function(n){return ee(Ac(vc(n).replace(_n,"")),t,"")}}function fi(t){return function(){var n=arguments;switch(n.length){case 0:return new t;case 1:return new t(n[0]);case 2:return new t(n[0],n[1]);case 3:return new t(n[0],n[1],n[2]);case 4:return new t(n[0],n[1],n[2],n[3]);case 5:return new t(n[0],n[1],n[2],n[3],n[4]);case 6:return new t(n[0],n[1],n[2],n[3],n[4],n[5]);case 7:return new t(n[0],n[1],n[2],n[3],n[4],n[5],n[6])}var e=pr(t.prototype),r=t.apply(e,n);return Ia(r)?r:e}}function hi(t){return function(n,e,r){var o=nn(n);if(!_a(n)){var u=Ri(e,3);n=oc(n),e=function(t){return u(o[t],t,o)};}var a=t(n,e,r);return a>-1?o[u?n[a]:a]:i}}function di(t){return Ti(function(n){var e=n.length,r=e,o=vr.prototype.thru;for(t&&n.reverse();r--;){var u=n[r];if("function"!=typeof u)throw new on(c);if(o&&!a&&"wrapper"==Ni(u))var a=new vr([],!0);}for(r=a?r:e;++r<e;){var s=Ni(u=n[r]),l="wrapper"==s?Li(u):i;a=l&&Hi(l[0])&&l[1]==(A|y|w|j)&&!l[4].length&&1==l[9]?a[Ni(l[0])].apply(a,l[3]):1==u.length&&Hi(u)?a[s]():a.thru(u);}return function(){var t=arguments,r=t[0];if(a&&1==t.length&&ma(r))return a.plant(r).value();for(var o=0,i=e?n[o].apply(this,t):r;++o<e;)i=n[o].call(this,i);return i}})}function pi(t,n,e,o,u,a,c,s,l,f){var h=n&A,d=n&m,p=n&x,g=n&(y|b),v=n&E,_=p?i:fi(t);return function m(){for(var x=arguments.length,y=r(x),b=x;b--;)y[b]=arguments[b];if(g)var w=Ci(m),M=function(t,n){for(var e=t.length,r=0;e--;)t[e]===n&&++r;return r}(y,w);if(o&&(y=ni(y,o,u,g)),a&&(y=ei(y,a,c,g)),x-=M,g&&x<f){var A=Pe(y,w);return bi(t,n,pi,m.placeholder,e,y,A,s,l,f-x)}var j=d?e:this,E=p?j[t]:t;return x=y.length,s?y=function(t,n){for(var e=t.length,r=Ge(n.length,e),o=ri(t);r--;){var u=n[r];t[r]=Gi(u,e)?o[u]:i;}return t}(y,s):v&&x>1&&y.reverse(),h&&l<x&&(y.length=l),this&&this!==Nn&&this instanceof m&&(E=_||fi(E)),E.apply(j,y)}}function gi(t,n){return function(e,r){return function(t,n,e,r){return Zr(t,function(t,o,i){n(r,e(t),o,i);}),r}(e,t,n(r),{})}}function vi(t,n){return function(e,r){var o;if(e===i&&r===i)return n;if(e!==i&&(o=e),r!==i){if(o===i)return r;"string"==typeof e||"string"==typeof r?(e=ko(e),r=ko(r)):(e=Ro(e),r=Ro(r)),o=t(e,r);}return o}}function mi(t){return Ti(function(n){return n=te(n,me(Ri())),Ao(function(e){var r=this;return t(n,function(t){return Gn(t,r,e)})})})}function xi(t,n){var e=(n=n===i?" ":ko(n)).length;if(e<2)return e?Mo(n,t):n;var r=Mo(n,De(t/Oe(n)));return je(n)?Ho(ze(r),0,t).join(""):r.slice(0,t)}function _i(t){return function(n,e,o){return o&&"number"!=typeof o&&Zi(n,e,o)&&(e=o=i),n=Ba(n),e===i?(e=n,n=0):e=Ba(e),function(t,n,e,o){for(var i=-1,u=Xe(De((n-t)/(e||1)),0),a=r(u);u--;)a[o?u:++i]=t,t+=e;return a}(n,e,o=o===i?n<e?1:-1:Ba(o),t)}}function yi(t){return function(n,e){return "string"==typeof n&&"string"==typeof e||(n=Ua(n),e=Ua(e)),t(n,e)}}function bi(t,n,e,r,o,u,a,c,s,l){var f=n&y;n|=f?w:M,(n&=~(f?M:w))&_||(n&=~(m|x));var h=[t,n,o,f?u:i,f?a:i,f?i:u,f?i:a,c,s,l],d=e.apply(i,h);return Hi(t)&&ru(d,h),d.placeholder=r,uu(d,t,n)}function wi(t){var n=tn[t];return function(t,e){if(t=Ua(t),e=null==e?0:Ge(qa(e),292)){var r=(Xa(t)+"e").split("e");return +((r=(Xa(n(r[0]+"e"+(+r[1]+e)))+"e").split("e"))[0]+"e"+(+r[1]-e))}return n(t)}}var Mi=tr&&1/Se(new tr([,-0]))[1]==L?function(t){return new tr(t)}:Cc;function Ai(t){return function(n){var e=Yi(n);return e==$?Ee(n):e==et?Te(n):function(t,n){return te(n,function(n){return [n,t[n]]})}(n,t(n))}}function ji(t,n,e,o,u,a,s,l){var h=n&x;if(!h&&"function"!=typeof t)throw new on(c);var d=o?o.length:0;if(d||(n&=~(w|M),o=u=i),s=s===i?s:Xe(qa(s),0),l=l===i?l:qa(l),d-=u?u.length:0,n&M){var p=o,g=u;o=u=i;}var v=h?i:Li(t),E=[t,n,e,o,u,p,g,a,s,l];if(v&&function(t,n){var e=t[1],r=n[1],o=e|r,i=o<(m|x|A),u=r==A&&e==y||r==A&&e==j&&t[7].length<=n[8]||r==(A|j)&&n[7].length<=n[8]&&e==y;if(!i&&!u)return t;r&m&&(t[2]=n[2],o|=e&m?0:_);var a=n[3];if(a){var c=t[3];t[3]=c?ni(c,a,n[4]):a,t[4]=c?Pe(t[3],f):n[4];}(a=n[5])&&(c=t[5],t[5]=c?ei(c,a,n[6]):a,t[6]=c?Pe(t[5],f):n[6]),(a=n[7])&&(t[7]=a),r&A&&(t[8]=null==t[8]?n[8]:Ge(t[8],n[8])),null==t[9]&&(t[9]=n[9]),t[0]=n[0],t[1]=o;}(E,v),t=E[0],n=E[1],e=E[2],o=E[3],u=E[4],!(l=E[9]=E[9]===i?h?0:t.length:Xe(E[9]-d,0))&&n&(y|b)&&(n&=~(y|b)),n&&n!=m)I=n==y||n==b?function(t,n,e){var o=fi(t);return function u(){for(var a=arguments.length,c=r(a),s=a,l=Ci(u);s--;)c[s]=arguments[s];var f=a<3&&c[0]!==l&&c[a-1]!==l?[]:Pe(c,l);return (a-=f.length)<e?bi(t,n,pi,u.placeholder,i,c,f,i,i,e-a):Gn(this&&this!==Nn&&this instanceof u?o:t,this,c)}}(t,n,l):n!=w&&n!=(m|w)||u.length?pi.apply(i,E):function(t,n,e,o){var i=n&m,u=fi(t);return function n(){for(var a=-1,c=arguments.length,s=-1,l=o.length,f=r(l+c),h=this&&this!==Nn&&this instanceof n?u:t;++s<l;)f[s]=o[s];for(;c--;)f[s++]=arguments[++a];return Gn(h,i?e:this,f)}}(t,n,e,o);else var I=function(t,n,e){var r=n&m,o=fi(t);return function n(){return (this&&this!==Nn&&this instanceof n?o:t).apply(r?e:this,arguments)}}(t,n,e);return uu((v?Po:ru)(I,E),t,n)}function Ei(t,n,e,r){return t===i||da(t,cn[e])&&!fn.call(r,e)?n:t}function Ii(t,n,e,r,o,u){return Ia(t)&&Ia(n)&&(u.set(n,t),vo(t,n,i,Ii,u),u.delete(n)),t}function Pi(t){return Oa(t)?i:t}function Si(t,n,e,r,o,u){var a=e&g,c=t.length,s=n.length;if(c!=s&&!(a&&s>c))return !1;var l=u.get(t);if(l&&u.get(n))return l==n;var f=-1,h=!0,d=e&v?new br:i;for(u.set(t,n),u.set(n,t);++f<c;){var p=t[f],m=n[f];if(r)var x=a?r(m,p,f,n,t,u):r(p,m,f,t,n,u);if(x!==i){if(x)continue;h=!1;break}if(d){if(!oe(n,function(t,n){if(!_e(d,n)&&(p===t||o(p,t,e,r,u)))return d.push(n)})){h=!1;break}}else if(p!==m&&!o(p,m,e,r,u)){h=!1;break}}return u.delete(t),u.delete(n),h}function Ti(t){return iu(tu(t,i,xu),t+"")}function Oi(t){return Kr(t,oc,Bi)}function zi(t){return Kr(t,ic,qi)}var Li=rr?function(t){return rr.get(t)}:Cc;function Ni(t){for(var n=t.name+"",e=or[n],r=fn.call(or,n)?e.length:0;r--;){var o=e[r],i=o.func;if(null==i||i==t)return o.name}return n}function Ci(t){return (fn.call(dr,"placeholder")?dr:t).placeholder}function Ri(){var t=dr.iteratee||Oc;return t=t===Oc?co:t,arguments.length?t(arguments[0],arguments[1]):t}function ki(t,n){var e,r,o=t.__data__;return ("string"==(r=typeof(e=n))||"number"==r||"symbol"==r||"boolean"==r?"__proto__"!==e:null===e)?o["string"==typeof n?"string":"hash"]:o.map}function Di(t){for(var n=oc(t),e=n.length;e--;){var r=n[e],o=t[r];n[e]=[r,o,Qi(o)];}return n}function Vi(t,n){var e=function(t,n){return null==t?i:t[n]}(t,n);return ao(e)?e:i}var Bi=Be?function(t){return null==t?[]:(t=nn(t),Kn(Be(t),function(n){return Cn.call(t,n)}))}:Yc,qi=Be?function(t){for(var n=[];t;)ne(n,Bi(t)),t=zn(t);return n}:Yc,Yi=Qr;function Ui(t,n,e){for(var r=-1,o=(n=Zo(n,t)).length,i=!1;++r<o;){var u=lu(n[r]);if(!(i=null!=t&&e(t,u)))break;t=t[u];}return i||++r!=o?i:!!(o=null==t?0:t.length)&&Ea(o)&&Gi(u,o)&&(ma(t)||va(t))}function Fi(t){return "function"!=typeof t.constructor||Ki(t)?{}:pr(zn(t))}function Xi(t){return ma(t)||va(t)||!!(Dn&&t&&t[Dn])}function Gi(t,n){var e=typeof t;return !!(n=null==n?N:n)&&("number"==e||"symbol"!=e&&Wt.test(t))&&t>-1&&t%1==0&&t<n}function Zi(t,n,e){if(!Ia(e))return !1;var r=typeof n;return !!("number"==r?_a(e)&&Gi(n,e.length):"string"==r&&n in e)&&da(e[n],t)}function Wi(t,n){if(ma(t))return !1;var e=typeof t;return !("number"!=e&&"symbol"!=e&&"boolean"!=e&&null!=t&&!Ca(t))||Tt.test(t)||!St.test(t)||null!=n&&t in nn(n)}function Hi(t){var n=Ni(t),e=dr[n];if("function"!=typeof e||!(n in mr.prototype))return !1;if(t===e)return !0;var r=Li(e);return !!r&&t===r[0]}(Ke&&Yi(new Ke(new ArrayBuffer(1)))!=st||Qe&&Yi(new Qe)!=$||Je&&"[object Promise]"!=Yi(Je.resolve())||tr&&Yi(new tr)!=et||nr&&Yi(new nr)!=ut)&&(Yi=function(t){var n=Qr(t),e=n==J?t.constructor:i,r=e?fu(e):"";if(r)switch(r){case ir:return st;case ur:return $;case ar:return "[object Promise]";case cr:return et;case sr:return ut}return n});var $i=sn?Aa:Uc;function Ki(t){var n=t&&t.constructor;return t===("function"==typeof n&&n.prototype||cn)}function Qi(t){return t==t&&!Ia(t)}function Ji(t,n){return function(e){return null!=e&&e[t]===n&&(n!==i||t in nn(e))}}function tu(t,n,e){return n=Xe(n===i?t.length-1:n,0),function(){for(var o=arguments,i=-1,u=Xe(o.length-n,0),a=r(u);++i<u;)a[i]=o[n+i];i=-1;for(var c=r(n+1);++i<n;)c[i]=o[i];return c[n]=e(a),Gn(t,this,c)}}function nu(t,n){return n.length<2?t:$r(t,Oo(n,0,-1))}function eu(t,n){if("__proto__"!=n)return t[n]}var ru=au(Po),ou=ke||function(t,n){return Nn.setTimeout(t,n)},iu=au(So);function uu(t,n,e){var r=n+"";return iu(t,function(t,n){var e=n.length;if(!e)return t;var r=e-1;return n[r]=(e>1?"& ":"")+n[r],n=n.join(e>2?", ":" "),t.replace(kt,"{\n/* [wrapped with "+n+"] */\n")}(r,function(t,n){return Wn(B,function(e){var r="_."+e[0];n&e[1]&&!Qn(t,r)&&t.push(r);}),t.sort()}(function(t){var n=t.match(Dt);return n?n[1].split(Vt):[]}(r),e)))}function au(t){var n=0,e=0;return function(){var r=Ze(),o=T-(r-e);if(e=r,o>0){if(++n>=S)return arguments[0]}else n=0;return t.apply(i,arguments)}}function cu(t,n){var e=-1,r=t.length,o=r-1;for(n=n===i?r:n;++e<n;){var u=wo(e,o),a=t[u];t[u]=t[e],t[e]=a;}return t.length=n,t}var su=function(t){var n=aa(t,function(t){return e.size===l&&e.clear(),t}),e=n.cache;return n}(function(t){var n=[];return 46===t.charCodeAt(0)&&n.push(""),t.replace(Ot,function(t,e,r,o){n.push(r?o.replace(qt,"$1"):e||t);}),n});function lu(t){if("string"==typeof t||Ca(t))return t;var n=t+"";return "0"==n&&1/t==-L?"-0":n}function fu(t){if(null!=t){try{return ln.call(t)}catch(t){}try{return t+""}catch(t){}}return ""}function hu(t){if(t instanceof mr)return t.clone();var n=new vr(t.__wrapped__,t.__chain__);return n.__actions__=ri(t.__actions__),n.__index__=t.__index__,n.__values__=t.__values__,n}var du=Ao(function(t,n){return ya(t)?Dr(t,Fr(n,1,ya,!0)):[]}),pu=Ao(function(t,n){var e=Mu(n);return ya(e)&&(e=i),ya(t)?Dr(t,Fr(n,1,ya,!0),Ri(e,2)):[]}),gu=Ao(function(t,n){var e=Mu(n);return ya(e)&&(e=i),ya(t)?Dr(t,Fr(n,1,ya,!0),i,e):[]});function vu(t,n,e){var r=null==t?0:t.length;if(!r)return -1;var o=null==e?0:qa(e);return o<0&&(o=Xe(r+o,0)),ae(t,Ri(n,3),o)}function mu(t,n,e){var r=null==t?0:t.length;if(!r)return -1;var o=r-1;return e!==i&&(o=qa(e),o=e<0?Xe(r+o,0):Ge(o,r-1)),ae(t,Ri(n,3),o,!0)}function xu(t){return null!=t&&t.length?Fr(t,1):[]}function _u(t){return t&&t.length?t[0]:i}var yu=Ao(function(t){var n=te(t,Xo);return n.length&&n[0]===t[0]?eo(n):[]}),bu=Ao(function(t){var n=Mu(t),e=te(t,Xo);return n===Mu(e)?n=i:e.pop(),e.length&&e[0]===t[0]?eo(e,Ri(n,2)):[]}),wu=Ao(function(t){var n=Mu(t),e=te(t,Xo);return (n="function"==typeof n?n:i)&&e.pop(),e.length&&e[0]===t[0]?eo(e,i,n):[]});function Mu(t){var n=null==t?0:t.length;return n?t[n-1]:i}var Au=Ao(ju);function ju(t,n){return t&&t.length&&n&&n.length?yo(t,n):t}var Eu=Ti(function(t,n){var e=null==t?0:t.length,r=Lr(t,n);return bo(t,te(n,function(t){return Gi(t,e)?+t:t}).sort(ti)),r});function Iu(t){return null==t?t:$e.call(t)}var Pu=Ao(function(t){return Do(Fr(t,1,ya,!0))}),Su=Ao(function(t){var n=Mu(t);return ya(n)&&(n=i),Do(Fr(t,1,ya,!0),Ri(n,2))}),Tu=Ao(function(t){var n=Mu(t);return n="function"==typeof n?n:i,Do(Fr(t,1,ya,!0),i,n)});function Ou(t){if(!t||!t.length)return [];var n=0;return t=Kn(t,function(t){if(ya(t))return n=Xe(t.length,n),!0}),ve(n,function(n){return te(t,he(n))})}function zu(t,n){if(!t||!t.length)return [];var e=Ou(t);return null==n?e:te(e,function(t){return Gn(n,i,t)})}var Lu=Ao(function(t,n){return ya(t)?Dr(t,n):[]}),Nu=Ao(function(t){return Uo(Kn(t,ya))}),Cu=Ao(function(t){var n=Mu(t);return ya(n)&&(n=i),Uo(Kn(t,ya),Ri(n,2))}),Ru=Ao(function(t){var n=Mu(t);return n="function"==typeof n?n:i,Uo(Kn(t,ya),i,n)}),ku=Ao(Ou);var Du=Ao(function(t){var n=t.length,e=n>1?t[n-1]:i;return zu(t,e="function"==typeof e?(t.pop(),e):i)});function Vu(t){var n=dr(t);return n.__chain__=!0,n}function Bu(t,n){return n(t)}var qu=Ti(function(t){var n=t.length,e=n?t[0]:0,r=this.__wrapped__,o=function(n){return Lr(n,t)};return !(n>1||this.__actions__.length)&&r instanceof mr&&Gi(e)?((r=r.slice(e,+e+(n?1:0))).__actions__.push({func:Bu,args:[o],thisArg:i}),new vr(r,this.__chain__).thru(function(t){return n&&!t.length&&t.push(i),t})):this.thru(o)});var Yu=ii(function(t,n,e){fn.call(t,e)?++t[e]:zr(t,e,1);});var Uu=hi(vu),Fu=hi(mu);function Xu(t,n){return (ma(t)?Wn:Vr)(t,Ri(n,3))}function Gu(t,n){return (ma(t)?Hn:Br)(t,Ri(n,3))}var Zu=ii(function(t,n,e){fn.call(t,e)?t[e].push(n):zr(t,e,[n]);});var Wu=Ao(function(t,n,e){var o=-1,i="function"==typeof n,u=_a(t)?r(t.length):[];return Vr(t,function(t){u[++o]=i?Gn(n,t,e):ro(t,n,e);}),u}),Hu=ii(function(t,n,e){zr(t,e,n);});function $u(t,n){return (ma(t)?te:ho)(t,Ri(n,3))}var Ku=ii(function(t,n,e){t[e?0:1].push(n);},function(){return [[],[]]});var Qu=Ao(function(t,n){if(null==t)return [];var e=n.length;return e>1&&Zi(t,n[0],n[1])?n=[]:e>2&&Zi(n[0],n[1],n[2])&&(n=[n[0]]),xo(t,Fr(n,1),[])}),Ju=Re||function(){return Nn.Date.now()};function ta(t,n,e){return n=e?i:n,n=t&&null==n?t.length:n,ji(t,A,i,i,i,i,n)}function na(t,n){var e;if("function"!=typeof n)throw new on(c);return t=qa(t),function(){return --t>0&&(e=n.apply(this,arguments)),t<=1&&(n=i),e}}var ea=Ao(function(t,n,e){var r=m;if(e.length){var o=Pe(e,Ci(ea));r|=w;}return ji(t,r,n,e,o)}),ra=Ao(function(t,n,e){var r=m|x;if(e.length){var o=Pe(e,Ci(ra));r|=w;}return ji(n,r,t,e,o)});function oa(t,n,e){var r,o,u,a,s,l,f=0,h=!1,d=!1,p=!0;if("function"!=typeof t)throw new on(c);function g(n){var e=r,u=o;return r=o=i,f=n,a=t.apply(u,e)}function v(t){var e=t-l;return l===i||e>=n||e<0||d&&t-f>=u}function m(){var t=Ju();if(v(t))return x(t);s=ou(m,function(t){var e=n-(t-l);return d?Ge(e,u-(t-f)):e}(t));}function x(t){return s=i,p&&r?g(t):(r=o=i,a)}function _(){var t=Ju(),e=v(t);if(r=arguments,o=this,l=t,e){if(s===i)return function(t){return f=t,s=ou(m,n),h?g(t):a}(l);if(d)return s=ou(m,n),g(l)}return s===i&&(s=ou(m,n)),a}return n=Ua(n)||0,Ia(e)&&(h=!!e.leading,u=(d="maxWait"in e)?Xe(Ua(e.maxWait)||0,n):u,p="trailing"in e?!!e.trailing:p),_.cancel=function(){s!==i&&$o(s),f=0,r=l=o=s=i;},_.flush=function(){return s===i?a:x(Ju())},_}var ia=Ao(function(t,n){return kr(t,1,n)}),ua=Ao(function(t,n,e){return kr(t,Ua(n)||0,e)});function aa(t,n){if("function"!=typeof t||null!=n&&"function"!=typeof n)throw new on(c);var e=function(){var r=arguments,o=n?n.apply(this,r):r[0],i=e.cache;if(i.has(o))return i.get(o);var u=t.apply(this,r);return e.cache=i.set(o,u)||i,u};return e.cache=new(aa.Cache||yr),e}function ca(t){if("function"!=typeof t)throw new on(c);return function(){var n=arguments;switch(n.length){case 0:return !t.call(this);case 1:return !t.call(this,n[0]);case 2:return !t.call(this,n[0],n[1]);case 3:return !t.call(this,n[0],n[1],n[2])}return !t.apply(this,n)}}aa.Cache=yr;var sa=Wo(function(t,n){var e=(n=1==n.length&&ma(n[0])?te(n[0],me(Ri())):te(Fr(n,1),me(Ri()))).length;return Ao(function(r){for(var o=-1,i=Ge(r.length,e);++o<i;)r[o]=n[o].call(this,r[o]);return Gn(t,this,r)})}),la=Ao(function(t,n){var e=Pe(n,Ci(la));return ji(t,w,i,n,e)}),fa=Ao(function(t,n){var e=Pe(n,Ci(fa));return ji(t,M,i,n,e)}),ha=Ti(function(t,n){return ji(t,j,i,i,i,n)});function da(t,n){return t===n||t!=t&&n!=n}var pa=yi(Jr),ga=yi(function(t,n){return t>=n}),va=oo(function(){return arguments}())?oo:function(t){return Pa(t)&&fn.call(t,"callee")&&!Cn.call(t,"callee")},ma=r.isArray,xa=Bn?me(Bn):function(t){return Pa(t)&&Qr(t)==ct};function _a(t){return null!=t&&Ea(t.length)&&!Aa(t)}function ya(t){return Pa(t)&&_a(t)}var ba=qe||Uc,wa=qn?me(qn):function(t){return Pa(t)&&Qr(t)==X};function Ma(t){if(!Pa(t))return !1;var n=Qr(t);return n==Z||n==G||"string"==typeof t.message&&"string"==typeof t.name&&!Oa(t)}function Aa(t){if(!Ia(t))return !1;var n=Qr(t);return n==W||n==H||n==U||n==tt}function ja(t){return "number"==typeof t&&t==qa(t)}function Ea(t){return "number"==typeof t&&t>-1&&t%1==0&&t<=N}function Ia(t){var n=typeof t;return null!=t&&("object"==n||"function"==n)}function Pa(t){return null!=t&&"object"==typeof t}var Sa=Yn?me(Yn):function(t){return Pa(t)&&Yi(t)==$};function Ta(t){return "number"==typeof t||Pa(t)&&Qr(t)==K}function Oa(t){if(!Pa(t)||Qr(t)!=J)return !1;var n=zn(t);if(null===n)return !0;var e=fn.call(n,"constructor")&&n.constructor;return "function"==typeof e&&e instanceof e&&ln.call(e)==gn}var za=Un?me(Un):function(t){return Pa(t)&&Qr(t)==nt};var La=Fn?me(Fn):function(t){return Pa(t)&&Yi(t)==et};function Na(t){return "string"==typeof t||!ma(t)&&Pa(t)&&Qr(t)==rt}function Ca(t){return "symbol"==typeof t||Pa(t)&&Qr(t)==ot}var Ra=Xn?me(Xn):function(t){return Pa(t)&&Ea(t.length)&&!!In[Qr(t)]};var ka=yi(fo),Da=yi(function(t,n){return t<=n});function Va(t){if(!t)return [];if(_a(t))return Na(t)?ze(t):ri(t);if(Vn&&t[Vn])return function(t){for(var n,e=[];!(n=t.next()).done;)e.push(n.value);return e}(t[Vn]());var n=Yi(t);return (n==$?Ee:n==et?Se:dc)(t)}function Ba(t){return t?(t=Ua(t))===L||t===-L?(t<0?-1:1)*C:t==t?t:0:0===t?t:0}function qa(t){var n=Ba(t),e=n%1;return n==n?e?n-e:n:0}function Ya(t){return t?Nr(qa(t),0,k):0}function Ua(t){if("number"==typeof t)return t;if(Ca(t))return R;if(Ia(t)){var n="function"==typeof t.valueOf?t.valueOf():t;t=Ia(n)?n+"":n;}if("string"!=typeof t)return 0===t?t:+t;t=t.replace(Nt,"");var e=Xt.test(t);return e||Zt.test(t)?On(t.slice(2),e?2:8):Ft.test(t)?R:+t}function Fa(t){return oi(t,ic(t))}function Xa(t){return null==t?"":ko(t)}var Ga=ui(function(t,n){if(Ki(n)||_a(n))oi(n,oc(n),t);else for(var e in n)fn.call(n,e)&&Pr(t,e,n[e]);}),Za=ui(function(t,n){oi(n,ic(n),t);}),Wa=ui(function(t,n,e,r){oi(n,ic(n),t,r);}),Ha=ui(function(t,n,e,r){oi(n,oc(n),t,r);}),$a=Ti(Lr);var Ka=Ao(function(t,n){t=nn(t);var e=-1,r=n.length,o=r>2?n[2]:i;for(o&&Zi(n[0],n[1],o)&&(r=1);++e<r;)for(var u=n[e],a=ic(u),c=-1,s=a.length;++c<s;){var l=a[c],f=t[l];(f===i||da(f,cn[l])&&!fn.call(t,l))&&(t[l]=u[l]);}return t}),Qa=Ao(function(t){return t.push(i,Ii),Gn(ac,i,t)});function Ja(t,n,e){var r=null==t?i:$r(t,n);return r===i?e:r}function tc(t,n){return null!=t&&Ui(t,n,no)}var nc=gi(function(t,n,e){null!=n&&"function"!=typeof n.toString&&(n=pn.call(n)),t[n]=e;},Ic(Tc)),ec=gi(function(t,n,e){null!=n&&"function"!=typeof n.toString&&(n=pn.call(n)),fn.call(t,n)?t[n].push(e):t[n]=[e];},Ri),rc=Ao(ro);function oc(t){return _a(t)?Mr(t):so(t)}function ic(t){return _a(t)?Mr(t,!0):lo(t)}var uc=ui(function(t,n,e){vo(t,n,e);}),ac=ui(function(t,n,e,r){vo(t,n,e,r);}),cc=Ti(function(t,n){var e={};if(null==t)return e;var r=!1;n=te(n,function(n){return n=Zo(n,t),r||(r=n.length>1),n}),oi(t,zi(t),e),r&&(e=Cr(e,h|d|p,Pi));for(var o=n.length;o--;)Vo(e,n[o]);return e});var sc=Ti(function(t,n){return null==t?{}:function(t,n){return _o(t,n,function(n,e){return tc(t,e)})}(t,n)});function lc(t,n){if(null==t)return {};var e=te(zi(t),function(t){return [t]});return n=Ri(n),_o(t,e,function(t,e){return n(t,e[0])})}var fc=Ai(oc),hc=Ai(ic);function dc(t){return null==t?[]:xe(t,oc(t))}var pc=li(function(t,n,e){return n=n.toLowerCase(),t+(e?gc(n):n)});function gc(t){return Mc(Xa(t).toLowerCase())}function vc(t){return (t=Xa(t))&&t.replace(Ht,we).replace(yn,"")}var mc=li(function(t,n,e){return t+(e?"-":"")+n.toLowerCase()}),xc=li(function(t,n,e){return t+(e?" ":"")+n.toLowerCase()}),_c=si("toLowerCase");var yc=li(function(t,n,e){return t+(e?"_":"")+n.toLowerCase()});var bc=li(function(t,n,e){return t+(e?" ":"")+Mc(n)});var wc=li(function(t,n,e){return t+(e?" ":"")+n.toUpperCase()}),Mc=si("toUpperCase");function Ac(t,n,e){return t=Xa(t),(n=e?i:n)===i?function(t){return An.test(t)}(t)?function(t){return t.match(wn)||[]}(t):function(t){return t.match(Bt)||[]}(t):t.match(n)||[]}var jc=Ao(function(t,n){try{return Gn(t,i,n)}catch(t){return Ma(t)?t:new Qt(t)}}),Ec=Ti(function(t,n){return Wn(n,function(n){n=lu(n),zr(t,n,ea(t[n],t));}),t});function Ic(t){return function(){return t}}var Pc=di(),Sc=di(!0);function Tc(t){return t}function Oc(t){return co("function"==typeof t?t:Cr(t,h))}var zc=Ao(function(t,n){return function(e){return ro(e,t,n)}}),Lc=Ao(function(t,n){return function(e){return ro(t,e,n)}});function Nc(t,n,e){var r=oc(n),o=Hr(n,r);null!=e||Ia(n)&&(o.length||!r.length)||(e=n,n=t,t=this,o=Hr(n,oc(n)));var i=!(Ia(e)&&"chain"in e&&!e.chain),u=Aa(t);return Wn(o,function(e){var r=n[e];t[e]=r,u&&(t.prototype[e]=function(){var n=this.__chain__;if(i||n){var e=t(this.__wrapped__);return (e.__actions__=ri(this.__actions__)).push({func:r,args:arguments,thisArg:t}),e.__chain__=n,e}return r.apply(t,ne([this.value()],arguments))});}),t}function Cc(){}var Rc=mi(te),kc=mi($n),Dc=mi(oe);function Vc(t){return Wi(t)?he(lu(t)):function(t){return function(n){return $r(n,t)}}(t)}var Bc=_i(),qc=_i(!0);function Yc(){return []}function Uc(){return !1}var Fc=vi(function(t,n){return t+n},0),Xc=wi("ceil"),Gc=vi(function(t,n){return t/n},1),Zc=wi("floor");var Wc,Hc=vi(function(t,n){return t*n},1),$c=wi("round"),Kc=vi(function(t,n){return t-n},0);return dr.after=function(t,n){if("function"!=typeof n)throw new on(c);return t=qa(t),function(){if(--t<1)return n.apply(this,arguments)}},dr.ary=ta,dr.assign=Ga,dr.assignIn=Za,dr.assignInWith=Wa,dr.assignWith=Ha,dr.at=$a,dr.before=na,dr.bind=ea,dr.bindAll=Ec,dr.bindKey=ra,dr.castArray=function(){if(!arguments.length)return [];var t=arguments[0];return ma(t)?t:[t]},dr.chain=Vu,dr.chunk=function(t,n,e){n=(e?Zi(t,n,e):n===i)?1:Xe(qa(n),0);var o=null==t?0:t.length;if(!o||n<1)return [];for(var u=0,a=0,c=r(De(o/n));u<o;)c[a++]=Oo(t,u,u+=n);return c},dr.compact=function(t){for(var n=-1,e=null==t?0:t.length,r=0,o=[];++n<e;){var i=t[n];i&&(o[r++]=i);}return o},dr.concat=function(){var t=arguments.length;if(!t)return [];for(var n=r(t-1),e=arguments[0],o=t;o--;)n[o-1]=arguments[o];return ne(ma(e)?ri(e):[e],Fr(n,1))},dr.cond=function(t){var n=null==t?0:t.length,e=Ri();return t=n?te(t,function(t){if("function"!=typeof t[1])throw new on(c);return [e(t[0]),t[1]]}):[],Ao(function(e){for(var r=-1;++r<n;){var o=t[r];if(Gn(o[0],this,e))return Gn(o[1],this,e)}})},dr.conforms=function(t){return function(t){var n=oc(t);return function(e){return Rr(e,t,n)}}(Cr(t,h))},dr.constant=Ic,dr.countBy=Yu,dr.create=function(t,n){var e=pr(t);return null==n?e:Or(e,n)},dr.curry=function t(n,e,r){var o=ji(n,y,i,i,i,i,i,e=r?i:e);return o.placeholder=t.placeholder,o},dr.curryRight=function t(n,e,r){var o=ji(n,b,i,i,i,i,i,e=r?i:e);return o.placeholder=t.placeholder,o},dr.debounce=oa,dr.defaults=Ka,dr.defaultsDeep=Qa,dr.defer=ia,dr.delay=ua,dr.difference=du,dr.differenceBy=pu,dr.differenceWith=gu,dr.drop=function(t,n,e){var r=null==t?0:t.length;return r?Oo(t,(n=e||n===i?1:qa(n))<0?0:n,r):[]},dr.dropRight=function(t,n,e){var r=null==t?0:t.length;return r?Oo(t,0,(n=r-(n=e||n===i?1:qa(n)))<0?0:n):[]},dr.dropRightWhile=function(t,n){return t&&t.length?qo(t,Ri(n,3),!0,!0):[]},dr.dropWhile=function(t,n){return t&&t.length?qo(t,Ri(n,3),!0):[]},dr.fill=function(t,n,e,r){var o=null==t?0:t.length;return o?(e&&"number"!=typeof e&&Zi(t,n,e)&&(e=0,r=o),function(t,n,e,r){var o=t.length;for((e=qa(e))<0&&(e=-e>o?0:o+e),(r=r===i||r>o?o:qa(r))<0&&(r+=o),r=e>r?0:Ya(r);e<r;)t[e++]=n;return t}(t,n,e,r)):[]},dr.filter=function(t,n){return (ma(t)?Kn:Ur)(t,Ri(n,3))},dr.flatMap=function(t,n){return Fr($u(t,n),1)},dr.flatMapDeep=function(t,n){return Fr($u(t,n),L)},dr.flatMapDepth=function(t,n,e){return e=e===i?1:qa(e),Fr($u(t,n),e)},dr.flatten=xu,dr.flattenDeep=function(t){return null!=t&&t.length?Fr(t,L):[]},dr.flattenDepth=function(t,n){return null!=t&&t.length?Fr(t,n=n===i?1:qa(n)):[]},dr.flip=function(t){return ji(t,E)},dr.flow=Pc,dr.flowRight=Sc,dr.fromPairs=function(t){for(var n=-1,e=null==t?0:t.length,r={};++n<e;){var o=t[n];r[o[0]]=o[1];}return r},dr.functions=function(t){return null==t?[]:Hr(t,oc(t))},dr.functionsIn=function(t){return null==t?[]:Hr(t,ic(t))},dr.groupBy=Zu,dr.initial=function(t){return null!=t&&t.length?Oo(t,0,-1):[]},dr.intersection=yu,dr.intersectionBy=bu,dr.intersectionWith=wu,dr.invert=nc,dr.invertBy=ec,dr.invokeMap=Wu,dr.iteratee=Oc,dr.keyBy=Hu,dr.keys=oc,dr.keysIn=ic,dr.map=$u,dr.mapKeys=function(t,n){var e={};return n=Ri(n,3),Zr(t,function(t,r,o){zr(e,n(t,r,o),t);}),e},dr.mapValues=function(t,n){var e={};return n=Ri(n,3),Zr(t,function(t,r,o){zr(e,r,n(t,r,o));}),e},dr.matches=function(t){return po(Cr(t,h))},dr.matchesProperty=function(t,n){return go(t,Cr(n,h))},dr.memoize=aa,dr.merge=uc,dr.mergeWith=ac,dr.method=zc,dr.methodOf=Lc,dr.mixin=Nc,dr.negate=ca,dr.nthArg=function(t){return t=qa(t),Ao(function(n){return mo(n,t)})},dr.omit=cc,dr.omitBy=function(t,n){return lc(t,ca(Ri(n)))},dr.once=function(t){return na(2,t)},dr.orderBy=function(t,n,e,r){return null==t?[]:(ma(n)||(n=null==n?[]:[n]),ma(e=r?i:e)||(e=null==e?[]:[e]),xo(t,n,e))},dr.over=Rc,dr.overArgs=sa,dr.overEvery=kc,dr.overSome=Dc,dr.partial=la,dr.partialRight=fa,dr.partition=Ku,dr.pick=sc,dr.pickBy=lc,dr.property=Vc,dr.propertyOf=function(t){return function(n){return null==t?i:$r(t,n)}},dr.pull=Au,dr.pullAll=ju,dr.pullAllBy=function(t,n,e){return t&&t.length&&n&&n.length?yo(t,n,Ri(e,2)):t},dr.pullAllWith=function(t,n,e){return t&&t.length&&n&&n.length?yo(t,n,i,e):t},dr.pullAt=Eu,dr.range=Bc,dr.rangeRight=qc,dr.rearg=ha,dr.reject=function(t,n){return (ma(t)?Kn:Ur)(t,ca(Ri(n,3)))},dr.remove=function(t,n){var e=[];if(!t||!t.length)return e;var r=-1,o=[],i=t.length;for(n=Ri(n,3);++r<i;){var u=t[r];n(u,r,t)&&(e.push(u),o.push(r));}return bo(t,o),e},dr.rest=function(t,n){if("function"!=typeof t)throw new on(c);return Ao(t,n=n===i?n:qa(n))},dr.reverse=Iu,dr.sampleSize=function(t,n,e){return n=(e?Zi(t,n,e):n===i)?1:qa(n),(ma(t)?jr:Eo)(t,n)},dr.set=function(t,n,e){return null==t?t:Io(t,n,e)},dr.setWith=function(t,n,e,r){return r="function"==typeof r?r:i,null==t?t:Io(t,n,e,r)},dr.shuffle=function(t){return (ma(t)?Er:To)(t)},dr.slice=function(t,n,e){var r=null==t?0:t.length;return r?(e&&"number"!=typeof e&&Zi(t,n,e)?(n=0,e=r):(n=null==n?0:qa(n),e=e===i?r:qa(e)),Oo(t,n,e)):[]},dr.sortBy=Qu,dr.sortedUniq=function(t){return t&&t.length?Co(t):[]},dr.sortedUniqBy=function(t,n){return t&&t.length?Co(t,Ri(n,2)):[]},dr.split=function(t,n,e){return e&&"number"!=typeof e&&Zi(t,n,e)&&(n=e=i),(e=e===i?k:e>>>0)?(t=Xa(t))&&("string"==typeof n||null!=n&&!za(n))&&!(n=ko(n))&&je(t)?Ho(ze(t),0,e):t.split(n,e):[]},dr.spread=function(t,n){if("function"!=typeof t)throw new on(c);return n=null==n?0:Xe(qa(n),0),Ao(function(e){var r=e[n],o=Ho(e,0,n);return r&&ne(o,r),Gn(t,this,o)})},dr.tail=function(t){var n=null==t?0:t.length;return n?Oo(t,1,n):[]},dr.take=function(t,n,e){return t&&t.length?Oo(t,0,(n=e||n===i?1:qa(n))<0?0:n):[]},dr.takeRight=function(t,n,e){var r=null==t?0:t.length;return r?Oo(t,(n=r-(n=e||n===i?1:qa(n)))<0?0:n,r):[]},dr.takeRightWhile=function(t,n){return t&&t.length?qo(t,Ri(n,3),!1,!0):[]},dr.takeWhile=function(t,n){return t&&t.length?qo(t,Ri(n,3)):[]},dr.tap=function(t,n){return n(t),t},dr.throttle=function(t,n,e){var r=!0,o=!0;if("function"!=typeof t)throw new on(c);return Ia(e)&&(r="leading"in e?!!e.leading:r,o="trailing"in e?!!e.trailing:o),oa(t,n,{leading:r,maxWait:n,trailing:o})},dr.thru=Bu,dr.toArray=Va,dr.toPairs=fc,dr.toPairsIn=hc,dr.toPath=function(t){return ma(t)?te(t,lu):Ca(t)?[t]:ri(su(Xa(t)))},dr.toPlainObject=Fa,dr.transform=function(t,n,e){var r=ma(t),o=r||ba(t)||Ra(t);if(n=Ri(n,4),null==e){var i=t&&t.constructor;e=o?r?new i:[]:Ia(t)&&Aa(i)?pr(zn(t)):{};}return (o?Wn:Zr)(t,function(t,r,o){return n(e,t,r,o)}),e},dr.unary=function(t){return ta(t,1)},dr.union=Pu,dr.unionBy=Su,dr.unionWith=Tu,dr.uniq=function(t){return t&&t.length?Do(t):[]},dr.uniqBy=function(t,n){return t&&t.length?Do(t,Ri(n,2)):[]},dr.uniqWith=function(t,n){return n="function"==typeof n?n:i,t&&t.length?Do(t,i,n):[]},dr.unset=function(t,n){return null==t||Vo(t,n)},dr.unzip=Ou,dr.unzipWith=zu,dr.update=function(t,n,e){return null==t?t:Bo(t,n,Go(e))},dr.updateWith=function(t,n,e,r){return r="function"==typeof r?r:i,null==t?t:Bo(t,n,Go(e),r)},dr.values=dc,dr.valuesIn=function(t){return null==t?[]:xe(t,ic(t))},dr.without=Lu,dr.words=Ac,dr.wrap=function(t,n){return la(Go(n),t)},dr.xor=Nu,dr.xorBy=Cu,dr.xorWith=Ru,dr.zip=ku,dr.zipObject=function(t,n){return Fo(t||[],n||[],Pr)},dr.zipObjectDeep=function(t,n){return Fo(t||[],n||[],Io)},dr.zipWith=Du,dr.entries=fc,dr.entriesIn=hc,dr.extend=Za,dr.extendWith=Wa,Nc(dr,dr),dr.add=Fc,dr.attempt=jc,dr.camelCase=pc,dr.capitalize=gc,dr.ceil=Xc,dr.clamp=function(t,n,e){return e===i&&(e=n,n=i),e!==i&&(e=(e=Ua(e))==e?e:0),n!==i&&(n=(n=Ua(n))==n?n:0),Nr(Ua(t),n,e)},dr.clone=function(t){return Cr(t,p)},dr.cloneDeep=function(t){return Cr(t,h|p)},dr.cloneDeepWith=function(t,n){return Cr(t,h|p,n="function"==typeof n?n:i)},dr.cloneWith=function(t,n){return Cr(t,p,n="function"==typeof n?n:i)},dr.conformsTo=function(t,n){return null==n||Rr(t,n,oc(n))},dr.deburr=vc,dr.defaultTo=function(t,n){return null==t||t!=t?n:t},dr.divide=Gc,dr.endsWith=function(t,n,e){t=Xa(t),n=ko(n);var r=t.length,o=e=e===i?r:Nr(qa(e),0,r);return (e-=n.length)>=0&&t.slice(e,o)==n},dr.eq=da,dr.escape=function(t){return (t=Xa(t))&&jt.test(t)?t.replace(Mt,Me):t},dr.escapeRegExp=function(t){return (t=Xa(t))&&Lt.test(t)?t.replace(zt,"\\$&"):t},dr.every=function(t,n,e){var r=ma(t)?$n:qr;return e&&Zi(t,n,e)&&(n=i),r(t,Ri(n,3))},dr.find=Uu,dr.findIndex=vu,dr.findKey=function(t,n){return ue(t,Ri(n,3),Zr)},dr.findLast=Fu,dr.findLastIndex=mu,dr.findLastKey=function(t,n){return ue(t,Ri(n,3),Wr)},dr.floor=Zc,dr.forEach=Xu,dr.forEachRight=Gu,dr.forIn=function(t,n){return null==t?t:Xr(t,Ri(n,3),ic)},dr.forInRight=function(t,n){return null==t?t:Gr(t,Ri(n,3),ic)},dr.forOwn=function(t,n){return t&&Zr(t,Ri(n,3))},dr.forOwnRight=function(t,n){return t&&Wr(t,Ri(n,3))},dr.get=Ja,dr.gt=pa,dr.gte=ga,dr.has=function(t,n){return null!=t&&Ui(t,n,to)},dr.hasIn=tc,dr.head=_u,dr.identity=Tc,dr.includes=function(t,n,e,r){t=_a(t)?t:dc(t),e=e&&!r?qa(e):0;var o=t.length;return e<0&&(e=Xe(o+e,0)),Na(t)?e<=o&&t.indexOf(n,e)>-1:!!o&&ce(t,n,e)>-1},dr.indexOf=function(t,n,e){var r=null==t?0:t.length;if(!r)return -1;var o=null==e?0:qa(e);return o<0&&(o=Xe(r+o,0)),ce(t,n,o)},dr.inRange=function(t,n,e){return n=Ba(n),e===i?(e=n,n=0):e=Ba(e),function(t,n,e){return t>=Ge(n,e)&&t<Xe(n,e)}(t=Ua(t),n,e)},dr.invoke=rc,dr.isArguments=va,dr.isArray=ma,dr.isArrayBuffer=xa,dr.isArrayLike=_a,dr.isArrayLikeObject=ya,dr.isBoolean=function(t){return !0===t||!1===t||Pa(t)&&Qr(t)==F},dr.isBuffer=ba,dr.isDate=wa,dr.isElement=function(t){return Pa(t)&&1===t.nodeType&&!Oa(t)},dr.isEmpty=function(t){if(null==t)return !0;if(_a(t)&&(ma(t)||"string"==typeof t||"function"==typeof t.splice||ba(t)||Ra(t)||va(t)))return !t.length;var n=Yi(t);if(n==$||n==et)return !t.size;if(Ki(t))return !so(t).length;for(var e in t)if(fn.call(t,e))return !1;return !0},dr.isEqual=function(t,n){return io(t,n)},dr.isEqualWith=function(t,n,e){var r=(e="function"==typeof e?e:i)?e(t,n):i;return r===i?io(t,n,i,e):!!r},dr.isError=Ma,dr.isFinite=function(t){return "number"==typeof t&&Ye(t)},dr.isFunction=Aa,dr.isInteger=ja,dr.isLength=Ea,dr.isMap=Sa,dr.isMatch=function(t,n){return t===n||uo(t,n,Di(n))},dr.isMatchWith=function(t,n,e){return e="function"==typeof e?e:i,uo(t,n,Di(n),e)},dr.isNaN=function(t){return Ta(t)&&t!=+t},dr.isNative=function(t){if($i(t))throw new Qt(a);return ao(t)},dr.isNil=function(t){return null==t},dr.isNull=function(t){return null===t},dr.isNumber=Ta,dr.isObject=Ia,dr.isObjectLike=Pa,dr.isPlainObject=Oa,dr.isRegExp=za,dr.isSafeInteger=function(t){return ja(t)&&t>=-N&&t<=N},dr.isSet=La,dr.isString=Na,dr.isSymbol=Ca,dr.isTypedArray=Ra,dr.isUndefined=function(t){return t===i},dr.isWeakMap=function(t){return Pa(t)&&Yi(t)==ut},dr.isWeakSet=function(t){return Pa(t)&&Qr(t)==at},dr.join=function(t,n){return null==t?"":Ue.call(t,n)},dr.kebabCase=mc,dr.last=Mu,dr.lastIndexOf=function(t,n,e){var r=null==t?0:t.length;if(!r)return -1;var o=r;return e!==i&&(o=(o=qa(e))<0?Xe(r+o,0):Ge(o,r-1)),n==n?function(t,n,e){for(var r=e+1;r--;)if(t[r]===n)return r;return r}(t,n,o):ae(t,le,o,!0)},dr.lowerCase=xc,dr.lowerFirst=_c,dr.lt=ka,dr.lte=Da,dr.max=function(t){return t&&t.length?Yr(t,Tc,Jr):i},dr.maxBy=function(t,n){return t&&t.length?Yr(t,Ri(n,2),Jr):i},dr.mean=function(t){return fe(t,Tc)},dr.meanBy=function(t,n){return fe(t,Ri(n,2))},dr.min=function(t){return t&&t.length?Yr(t,Tc,fo):i},dr.minBy=function(t,n){return t&&t.length?Yr(t,Ri(n,2),fo):i},dr.stubArray=Yc,dr.stubFalse=Uc,dr.stubObject=function(){return {}},dr.stubString=function(){return ""},dr.stubTrue=function(){return !0},dr.multiply=Hc,dr.nth=function(t,n){return t&&t.length?mo(t,qa(n)):i},dr.noConflict=function(){return Nn._===this&&(Nn._=vn),this},dr.noop=Cc,dr.now=Ju,dr.pad=function(t,n,e){t=Xa(t);var r=(n=qa(n))?Oe(t):0;if(!n||r>=n)return t;var o=(n-r)/2;return xi(Ve(o),e)+t+xi(De(o),e)},dr.padEnd=function(t,n,e){t=Xa(t);var r=(n=qa(n))?Oe(t):0;return n&&r<n?t+xi(n-r,e):t},dr.padStart=function(t,n,e){t=Xa(t);var r=(n=qa(n))?Oe(t):0;return n&&r<n?xi(n-r,e)+t:t},dr.parseInt=function(t,n,e){return e||null==n?n=0:n&&(n=+n),We(Xa(t).replace(Ct,""),n||0)},dr.random=function(t,n,e){if(e&&"boolean"!=typeof e&&Zi(t,n,e)&&(n=e=i),e===i&&("boolean"==typeof n?(e=n,n=i):"boolean"==typeof t&&(e=t,t=i)),t===i&&n===i?(t=0,n=1):(t=Ba(t),n===i?(n=t,t=0):n=Ba(n)),t>n){var r=t;t=n,n=r;}if(e||t%1||n%1){var o=He();return Ge(t+o*(n-t+Tn("1e-"+((o+"").length-1))),n)}return wo(t,n)},dr.reduce=function(t,n,e){var r=ma(t)?ee:pe,o=arguments.length<3;return r(t,Ri(n,4),e,o,Vr)},dr.reduceRight=function(t,n,e){var r=ma(t)?re:pe,o=arguments.length<3;return r(t,Ri(n,4),e,o,Br)},dr.repeat=function(t,n,e){return n=(e?Zi(t,n,e):n===i)?1:qa(n),Mo(Xa(t),n)},dr.replace=function(){var t=arguments,n=Xa(t[0]);return t.length<3?n:n.replace(t[1],t[2])},dr.result=function(t,n,e){var r=-1,o=(n=Zo(n,t)).length;for(o||(o=1,t=i);++r<o;){var u=null==t?i:t[lu(n[r])];u===i&&(r=o,u=e),t=Aa(u)?u.call(t):u;}return t},dr.round=$c,dr.runInContext=t,dr.sample=function(t){return (ma(t)?Ar:jo)(t)},dr.size=function(t){if(null==t)return 0;if(_a(t))return Na(t)?Oe(t):t.length;var n=Yi(t);return n==$||n==et?t.size:so(t).length},dr.snakeCase=yc,dr.some=function(t,n,e){var r=ma(t)?oe:zo;return e&&Zi(t,n,e)&&(n=i),r(t,Ri(n,3))},dr.sortedIndex=function(t,n){return Lo(t,n)},dr.sortedIndexBy=function(t,n,e){return No(t,n,Ri(e,2))},dr.sortedIndexOf=function(t,n){var e=null==t?0:t.length;if(e){var r=Lo(t,n);if(r<e&&da(t[r],n))return r}return -1},dr.sortedLastIndex=function(t,n){return Lo(t,n,!0)},dr.sortedLastIndexBy=function(t,n,e){return No(t,n,Ri(e,2),!0)},dr.sortedLastIndexOf=function(t,n){if(null!=t&&t.length){var e=Lo(t,n,!0)-1;if(da(t[e],n))return e}return -1},dr.startCase=bc,dr.startsWith=function(t,n,e){return t=Xa(t),e=null==e?0:Nr(qa(e),0,t.length),n=ko(n),t.slice(e,e+n.length)==n},dr.subtract=Kc,dr.sum=function(t){return t&&t.length?ge(t,Tc):0},dr.sumBy=function(t,n){return t&&t.length?ge(t,Ri(n,2)):0},dr.template=function(t,n,e){var r=dr.templateSettings;e&&Zi(t,n,e)&&(n=i),t=Xa(t),n=Wa({},n,r,Ei);var o,u,a=Wa({},n.imports,r.imports,Ei),c=oc(a),s=xe(a,c),l=0,f=n.interpolate||$t,h="__p += '",d=en((n.escape||$t).source+"|"+f.source+"|"+(f===Pt?Yt:$t).source+"|"+(n.evaluate||$t).source+"|$","g"),p="//# sourceURL="+("sourceURL"in n?n.sourceURL:"lodash.templateSources["+ ++En+"]")+"\n";t.replace(d,function(n,e,r,i,a,c){return r||(r=i),h+=t.slice(l,c).replace(Kt,Ae),e&&(o=!0,h+="' +\n__e("+e+") +\n'"),a&&(u=!0,h+="';\n"+a+";\n__p += '"),r&&(h+="' +\n((__t = ("+r+")) == null ? '' : __t) +\n'"),l=c+n.length,n}),h+="';\n";var g=n.variable;g||(h="with (obj) {\n"+h+"\n}\n"),h=(u?h.replace(_t,""):h).replace(yt,"$1").replace(bt,"$1;"),h="function("+(g||"obj")+") {\n"+(g?"":"obj || (obj = {});\n")+"var __t, __p = ''"+(o?", __e = _.escape":"")+(u?", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n":";\n")+h+"return __p\n}";var v=jc(function(){return Jt(c,p+"return "+h).apply(i,s)});if(v.source=h,Ma(v))throw v;return v},dr.times=function(t,n){if((t=qa(t))<1||t>N)return [];var e=k,r=Ge(t,k);n=Ri(n),t-=k;for(var o=ve(r,n);++e<t;)n(e);return o},dr.toFinite=Ba,dr.toInteger=qa,dr.toLength=Ya,dr.toLower=function(t){return Xa(t).toLowerCase()},dr.toNumber=Ua,dr.toSafeInteger=function(t){return t?Nr(qa(t),-N,N):0===t?t:0},dr.toString=Xa,dr.toUpper=function(t){return Xa(t).toUpperCase()},dr.trim=function(t,n,e){if((t=Xa(t))&&(e||n===i))return t.replace(Nt,"");if(!t||!(n=ko(n)))return t;var r=ze(t),o=ze(n);return Ho(r,ye(r,o),be(r,o)+1).join("")},dr.trimEnd=function(t,n,e){if((t=Xa(t))&&(e||n===i))return t.replace(Rt,"");if(!t||!(n=ko(n)))return t;var r=ze(t);return Ho(r,0,be(r,ze(n))+1).join("")},dr.trimStart=function(t,n,e){if((t=Xa(t))&&(e||n===i))return t.replace(Ct,"");if(!t||!(n=ko(n)))return t;var r=ze(t);return Ho(r,ye(r,ze(n))).join("")},dr.truncate=function(t,n){var e=I,r=P;if(Ia(n)){var o="separator"in n?n.separator:o;e="length"in n?qa(n.length):e,r="omission"in n?ko(n.omission):r;}var u=(t=Xa(t)).length;if(je(t)){var a=ze(t);u=a.length;}if(e>=u)return t;var c=e-Oe(r);if(c<1)return r;var s=a?Ho(a,0,c).join(""):t.slice(0,c);if(o===i)return s+r;if(a&&(c+=s.length-c),za(o)){if(t.slice(c).search(o)){var l,f=s;for(o.global||(o=en(o.source,Xa(Ut.exec(o))+"g")),o.lastIndex=0;l=o.exec(f);)var h=l.index;s=s.slice(0,h===i?c:h);}}else if(t.indexOf(ko(o),c)!=c){var d=s.lastIndexOf(o);d>-1&&(s=s.slice(0,d));}return s+r},dr.unescape=function(t){return (t=Xa(t))&&At.test(t)?t.replace(wt,Le):t},dr.uniqueId=function(t){var n=++hn;return Xa(t)+n},dr.upperCase=wc,dr.upperFirst=Mc,dr.each=Xu,dr.eachRight=Gu,dr.first=_u,Nc(dr,(Wc={},Zr(dr,function(t,n){fn.call(dr.prototype,n)||(Wc[n]=t);}),Wc),{chain:!1}),dr.VERSION="4.17.11",Wn(["bind","bindKey","curry","curryRight","partial","partialRight"],function(t){dr[t].placeholder=dr;}),Wn(["drop","take"],function(t,n){mr.prototype[t]=function(e){e=e===i?1:Xe(qa(e),0);var r=this.__filtered__&&!n?new mr(this):this.clone();return r.__filtered__?r.__takeCount__=Ge(e,r.__takeCount__):r.__views__.push({size:Ge(e,k),type:t+(r.__dir__<0?"Right":"")}),r},mr.prototype[t+"Right"]=function(n){return this.reverse()[t](n).reverse()};}),Wn(["filter","map","takeWhile"],function(t,n){var e=n+1,r=e==O||3==e;mr.prototype[t]=function(t){var n=this.clone();return n.__iteratees__.push({iteratee:Ri(t,3),type:e}),n.__filtered__=n.__filtered__||r,n};}),Wn(["head","last"],function(t,n){var e="take"+(n?"Right":"");mr.prototype[t]=function(){return this[e](1).value()[0]};}),Wn(["initial","tail"],function(t,n){var e="drop"+(n?"":"Right");mr.prototype[t]=function(){return this.__filtered__?new mr(this):this[e](1)};}),mr.prototype.compact=function(){return this.filter(Tc)},mr.prototype.find=function(t){return this.filter(t).head()},mr.prototype.findLast=function(t){return this.reverse().find(t)},mr.prototype.invokeMap=Ao(function(t,n){return "function"==typeof t?new mr(this):this.map(function(e){return ro(e,t,n)})}),mr.prototype.reject=function(t){return this.filter(ca(Ri(t)))},mr.prototype.slice=function(t,n){t=qa(t);var e=this;return e.__filtered__&&(t>0||n<0)?new mr(e):(t<0?e=e.takeRight(-t):t&&(e=e.drop(t)),n!==i&&(e=(n=qa(n))<0?e.dropRight(-n):e.take(n-t)),e)},mr.prototype.takeRightWhile=function(t){return this.reverse().takeWhile(t).reverse()},mr.prototype.toArray=function(){return this.take(k)},Zr(mr.prototype,function(t,n){var e=/^(?:filter|find|map|reject)|While$/.test(n),r=/^(?:head|last)$/.test(n),o=dr[r?"take"+("last"==n?"Right":""):n],u=r||/^find/.test(n);o&&(dr.prototype[n]=function(){var n=this.__wrapped__,a=r?[1]:arguments,c=n instanceof mr,s=a[0],l=c||ma(n),f=function(t){var n=o.apply(dr,ne([t],a));return r&&h?n[0]:n};l&&e&&"function"==typeof s&&1!=s.length&&(c=l=!1);var h=this.__chain__,d=!!this.__actions__.length,p=u&&!h,g=c&&!d;if(!u&&l){n=g?n:new mr(this);var v=t.apply(n,a);return v.__actions__.push({func:Bu,args:[f],thisArg:i}),new vr(v,h)}return p&&g?t.apply(this,a):(v=this.thru(f),p?r?v.value()[0]:v.value():v)});}),Wn(["pop","push","shift","sort","splice","unshift"],function(t){var n=un[t],e=/^(?:push|sort|unshift)$/.test(t)?"tap":"thru",r=/^(?:pop|shift)$/.test(t);dr.prototype[t]=function(){var t=arguments;if(r&&!this.__chain__){var o=this.value();return n.apply(ma(o)?o:[],t)}return this[e](function(e){return n.apply(ma(e)?e:[],t)})};}),Zr(mr.prototype,function(t,n){var e=dr[n];if(e){var r=e.name+"";(or[r]||(or[r]=[])).push({name:n,func:e});}}),or[pi(i,x).name]=[{name:"wrapper",func:i}],mr.prototype.clone=function(){var t=new mr(this.__wrapped__);return t.__actions__=ri(this.__actions__),t.__dir__=this.__dir__,t.__filtered__=this.__filtered__,t.__iteratees__=ri(this.__iteratees__),t.__takeCount__=this.__takeCount__,t.__views__=ri(this.__views__),t},mr.prototype.reverse=function(){if(this.__filtered__){var t=new mr(this);t.__dir__=-1,t.__filtered__=!0;}else (t=this.clone()).__dir__*=-1;return t},mr.prototype.value=function(){var t=this.__wrapped__.value(),n=this.__dir__,e=ma(t),r=n<0,o=e?t.length:0,i=function(t,n,e){for(var r=-1,o=e.length;++r<o;){var i=e[r],u=i.size;switch(i.type){case"drop":t+=u;break;case"dropRight":n-=u;break;case"take":n=Ge(n,t+u);break;case"takeRight":t=Xe(t,n-u);}}return {start:t,end:n}}(0,o,this.__views__),u=i.start,a=i.end,c=a-u,s=r?a:u-1,l=this.__iteratees__,f=l.length,h=0,d=Ge(c,this.__takeCount__);if(!e||!r&&o==c&&d==c)return Yo(t,this.__actions__);var p=[];t:for(;c--&&h<d;){for(var g=-1,v=t[s+=n];++g<f;){var m=l[g],x=m.iteratee,_=m.type,y=x(v);if(_==z)v=y;else if(!y){if(_==O)continue t;break t}}p[h++]=v;}return p},dr.prototype.at=qu,dr.prototype.chain=function(){return Vu(this)},dr.prototype.commit=function(){return new vr(this.value(),this.__chain__)},dr.prototype.next=function(){this.__values__===i&&(this.__values__=Va(this.value()));var t=this.__index__>=this.__values__.length;return {done:t,value:t?i:this.__values__[this.__index__++]}},dr.prototype.plant=function(t){for(var n,e=this;e instanceof gr;){var r=hu(e);r.__index__=0,r.__values__=i,n?o.__wrapped__=r:n=r;var o=r;e=e.__wrapped__;}return o.__wrapped__=t,n},dr.prototype.reverse=function(){var t=this.__wrapped__;if(t instanceof mr){var n=t;return this.__actions__.length&&(n=new mr(this)),(n=n.reverse()).__actions__.push({func:Bu,args:[Iu],thisArg:i}),new vr(n,this.__chain__)}return this.thru(Iu)},dr.prototype.toJSON=dr.prototype.valueOf=dr.prototype.value=function(){return Yo(this.__wrapped__,this.__actions__)},dr.prototype.first=dr.prototype.head,Vn&&(dr.prototype[Vn]=function(){return this}),dr}();Nn._=Ne,(o=function(){return Ne}.call(n,e,n,r))===i||(r.exports=o);}).call(this);}).call(this,e("./node_modules/webpack/buildin/global.js"),e("./node_modules/webpack/buildin/module.js")(t));},"./node_modules/webpack/buildin/global.js":function(t,n){var e;e=function(){return this}();try{e=e||Function("return this")()||(0,eval)("this");}catch(t){"object"==typeof window&&(e=window);}t.exports=e;},"./node_modules/webpack/buildin/module.js":function(t,n){t.exports=function(t){return t.webpackPolyfill||(t.deprecate=function(){},t.paths=[],t.children||(t.children=[]),Object.defineProperty(t,"loaded",{enumerable:!0,get:function(){return t.l}}),Object.defineProperty(t,"id",{enumerable:!0,get:function(){return t.i}}),t.webpackPolyfill=1),t};}})});
    });

    /* src\components\DynamicNetwork.svelte generated by Svelte v3.24.1 */

    const { console: console_1 } = globals;
    const file = "src\\components\\DynamicNetwork.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (114:4) {#each terms as t}
    function create_each_block(ctx) {
    	let label;
    	let input;
    	let input_value_value;
    	let t0;
    	let t1_value = /*t*/ ctx[16] + "";
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*t*/ ctx[16];
    			input.value = input.__value;
    			/*$$binding_groups*/ ctx[6][0].push(input);
    			add_location(input, file, 115, 8, 2956);
    			add_location(label, file, 114, 4, 2939);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = input.__value === /*term*/ ctx[0];
    			append_dev(label, t0);
    			append_dev(label, t1);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*term*/ 1) {
    				input.checked = input.__value === /*term*/ ctx[0];
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			/*$$binding_groups*/ ctx[6][0].splice(/*$$binding_groups*/ ctx[6][0].indexOf(input), 1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(114:4) {#each terms as t}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div1;
    	let button;
    	let t1;
    	let t2;
    	let div0;
    	let mounted;
    	let dispose;
    	let each_value = /*terms*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Progress";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div0 = element("div");
    			add_location(button, file, 112, 4, 2860);
    			attr_dev(div0, "id", "network-container");
    			attr_dev(div0, "class", "container svelte-iwpcd7");
    			add_location(div0, file, 119, 4, 3048);
    			add_location(div1, file, 111, 0, 2849);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, button);
    			append_dev(div1, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			/*div0_binding*/ ctx[7](div0);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*onProgress*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*terms, term*/ 5) {
    				each_value = /*terms*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			/*div0_binding*/ ctx[7](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { trans = undefined } = $$props;
    	let terms = ["Day", "Week", "Month", "Year"];
    	let term = "Day";
    	let validAccounts;
    	let validTrans;
    	let currentTime = undefined;
    	let beforeTime = undefined;
    	let toShow = ["CB2177", "CB793", "CB1179", "CB1382", "CB5270"];
    	var Bank;

    	(function (Bank) {
    		Bank[Bank["CB"] = 0] = "CB";
    		Bank[Bank["YZ"] = 1] = "YZ";
    		Bank[Bank["IJ"] = 2] = "IJ";
    		Bank[Bank["ST"] = 3] = "ST";
    		Bank[Bank["UV"] = 4] = "UV";
    		Bank[Bank["MN"] = 5] = "MN";
    		Bank[Bank["OP"] = 6] = "OP";
    		Bank[Bank["AB"] = 7] = "AB";
    		Bank[Bank["CD"] = 8] = "CD";
    		Bank[Bank["WX"] = 9] = "WX";
    		Bank[Bank["GH"] = 10] = "GH";
    		Bank[Bank["EF"] = 11] = "EF";
    		Bank[Bank["QR"] = 12] = "QR";
    		Bank[Bank["KL"] = 13] = "KL";
    		Bank[Bank[""] = 14] = "";
    	})(Bank || (Bank = {}));

    	let container;
    	let currentData;
    	let model = { nodes: [], edges: [] };

    	onMount(() => {
    		//console.log(accounts)
    		console.log(trans);

    		$$invalidate(9, beforeTime = 930104);
    		$$invalidate(8, currentTime = 930105);

    		toShow.forEach(d => {
    			model.nodes.push({ group: Bank[d.slice(0, 2)], label: d });
    		});
    	});

    	function onProgress() {
    		$$invalidate(9, beforeTime = currentTime);

    		if (term == "Day") {
    			$$invalidate(8, currentTime += 1);
    		} else if (term == "Week") {
    			$$invalidate(8, currentTime += 7);
    		} else if (term == "Month") {
    			$$invalidate(8, currentTime += 100);

    			if (currentTime % 10000 / 100 >= 13) {
    				$$invalidate(8, currentTime += 10000);
    				$$invalidate(8, currentTime -= 1200);
    			}
    		} else {
    			$$invalidate(8, currentTime += 10000);
    		}

    		console.log(currentTime);
    	}

    	const writable_props = ["trans"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<DynamicNetwork> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("DynamicNetwork", $$slots, []);
    	const $$binding_groups = [[]];

    	function input_change_handler() {
    		term = this.__value;
    		$$invalidate(0, term);
    	}

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			container = $$value;
    			$$invalidate(1, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("trans" in $$props) $$invalidate(4, trans = $$props.trans);
    	};

    	$$self.$capture_state = () => ({
    		ElGrapho: ElGrapho_min,
    		onMount,
    		trans,
    		terms,
    		term,
    		validAccounts,
    		validTrans,
    		currentTime,
    		beforeTime,
    		toShow,
    		Bank,
    		container,
    		currentData,
    		model,
    		onProgress
    	});

    	$$self.$inject_state = $$props => {
    		if ("trans" in $$props) $$invalidate(4, trans = $$props.trans);
    		if ("terms" in $$props) $$invalidate(2, terms = $$props.terms);
    		if ("term" in $$props) $$invalidate(0, term = $$props.term);
    		if ("validAccounts" in $$props) validAccounts = $$props.validAccounts;
    		if ("validTrans" in $$props) validTrans = $$props.validTrans;
    		if ("currentTime" in $$props) $$invalidate(8, currentTime = $$props.currentTime);
    		if ("beforeTime" in $$props) $$invalidate(9, beforeTime = $$props.beforeTime);
    		if ("toShow" in $$props) $$invalidate(13, toShow = $$props.toShow);
    		if ("Bank" in $$props) $$invalidate(10, Bank = $$props.Bank);
    		if ("container" in $$props) $$invalidate(1, container = $$props.container);
    		if ("currentData" in $$props) currentData = $$props.currentData;
    		if ("model" in $$props) $$invalidate(15, model = $$props.model);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentTime, trans, beforeTime, Bank, container*/ 1810) {
    			 if (currentTime != undefined) {
    				let newTrans = trans.filter(d => beforeTime < parseInt(d.date, 10) && parseInt(d.date, 10) <= currentTime && (toShow.includes(d.from) || toShow.includes(d.to)));

    				newTrans.forEach(d => {
    					if (!toShow.includes(d.from)) {
    						toShow.push(d.from);

    						model.nodes.push({
    							group: Bank[d.from.slice(0, 2)],
    							label: d.from
    						});
    					}

    					if (!toShow.includes(d.to)) {
    						toShow.push(d.to);

    						model.nodes.push({
    							group: Bank[d.to.slice(0, 2)],
    							label: d.to
    						});
    					}

    					model.edges.push({
    						from: toShow.indexOf(d.from),
    						to: toShow.indexOf(d.to)
    					});
    				});

    				console.log(model);

    				let graph = new ElGrapho_min({
    						container,
    						model: ElGrapho_min.layouts.Chord(model),
    						width: 800,
    						height: 600
    					});
    			}
    		}
    	};

    	return [
    		term,
    		container,
    		terms,
    		onProgress,
    		trans,
    		input_change_handler,
    		$$binding_groups,
    		div0_binding
    	];
    }

    class DynamicNetwork extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { trans: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DynamicNetwork",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get trans() {
    		throw new Error("<DynamicNetwork>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set trans(value) {
    		throw new Error("<DynamicNetwork>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\NetworkOverview.svelte generated by Svelte v3.24.1 */

    const { console: console_1$1 } = globals;
    const file$1 = "src\\components\\NetworkOverview.svelte";

    function create_fragment$1(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "id", "overview-container");
    			attr_dev(div0, "class", "container svelte-iwpcd7");
    			add_location(div0, file$1, 81, 4, 2001);
    			add_location(div1, file$1, 80, 0, 1990);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			/*div0_binding*/ ctx[2](div0);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			/*div0_binding*/ ctx[2](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { trans = undefined } = $$props;
    	let validAccounts;
    	let validTrans;
    	var Bank;

    	(function (Bank) {
    		Bank[Bank["CB"] = 0] = "CB";
    		Bank[Bank["YZ"] = 1] = "YZ";
    		Bank[Bank["IJ"] = 2] = "IJ";
    		Bank[Bank["ST"] = 3] = "ST";
    		Bank[Bank["UV"] = 4] = "UV";
    		Bank[Bank["MN"] = 5] = "MN";
    		Bank[Bank["OP"] = 6] = "OP";
    		Bank[Bank["AB"] = 7] = "AB";
    		Bank[Bank["CD"] = 8] = "CD";
    		Bank[Bank["WX"] = 9] = "WX";
    		Bank[Bank["GH"] = 10] = "GH";
    		Bank[Bank["EF"] = 11] = "EF";
    		Bank[Bank["QR"] = 12] = "QR";
    		Bank[Bank["KL"] = 13] = "KL";
    		Bank[Bank[""] = 14] = "";
    	})(Bank || (Bank = {}));

    	let graph;
    	let container;
    	let currentData;
    	let model = { nodes: [], edges: [] };

    	function spreadNodes() {
    		validAccounts.forEach(va => {
    			model.nodes.push({ group: Bank[va.slice(0, 2)] });
    		});

    		trans.forEach(tr => {
    			model.edges.push({
    				from: validAccounts.indexOf(tr.from),
    				to: validAccounts.indexOf(tr.to)
    			});
    		});

    		console.log(model);

    		let graph = new ElGrapho_min({
    				container,
    				model: ElGrapho_min.layouts.Cluster(model),
    				width: 1000,
    				height: 800,
    				debug: false,
    				nodeSize: 0.1,
    				edgeSize: 0.5,
    				//darkMode: true,
    				//glowBlend: 0.5,
    				nodeOutline: false
    			});

    		console.log("graph dones");
    	}

    	onMount(() => {
    		//console.log(accounts)
    		console.log(trans);

    		validAccounts = [];

    		trans.forEach(tr => {
    			if (!validAccounts.includes(tr.from)) {
    				validAccounts.push(tr.from);
    			}

    			if (!validAccounts.includes(tr.to)) {
    				validAccounts.push(tr.to);
    			}
    		});

    		spreadNodes();
    	});

    	const writable_props = ["trans"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<NetworkOverview> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NetworkOverview", $$slots, []);

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			container = $$value;
    			$$invalidate(0, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("trans" in $$props) $$invalidate(1, trans = $$props.trans);
    	};

    	$$self.$capture_state = () => ({
    		ElGrapho: ElGrapho_min,
    		onMount,
    		trans,
    		validAccounts,
    		validTrans,
    		Bank,
    		graph,
    		container,
    		currentData,
    		model,
    		spreadNodes
    	});

    	$$self.$inject_state = $$props => {
    		if ("trans" in $$props) $$invalidate(1, trans = $$props.trans);
    		if ("validAccounts" in $$props) validAccounts = $$props.validAccounts;
    		if ("validTrans" in $$props) validTrans = $$props.validTrans;
    		if ("Bank" in $$props) Bank = $$props.Bank;
    		if ("graph" in $$props) graph = $$props.graph;
    		if ("container" in $$props) $$invalidate(0, container = $$props.container);
    		if ("currentData" in $$props) currentData = $$props.currentData;
    		if ("model" in $$props) model = $$props.model;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [container, trans, div0_binding];
    }

    class NetworkOverview extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { trans: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NetworkOverview",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get trans() {
    		throw new Error("<NetworkOverview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set trans(value) {
    		throw new Error("<NetworkOverview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var papaparse_min = createCommonjsModule(function (module, exports) {
    /* @license
    Papa Parse
    v5.3.0
    https://github.com/mholt/PapaParse
    License: MIT
    */
    !function(e,t){module.exports=t();}(commonjsGlobal,function s(){var f="undefined"!=typeof self?self:"undefined"!=typeof window?window:void 0!==f?f:{};var n=!f.document&&!!f.postMessage,o=n&&/blob:/i.test((f.location||{}).protocol),a={},h=0,b={parse:function(e,t){var i=(t=t||{}).dynamicTyping||!1;U(i)&&(t.dynamicTypingFunction=i,i={});if(t.dynamicTyping=i,t.transform=!!U(t.transform)&&t.transform,t.worker&&b.WORKERS_SUPPORTED){var r=function(){if(!b.WORKERS_SUPPORTED)return !1;var e=(i=f.URL||f.webkitURL||null,r=s.toString(),b.BLOB_URL||(b.BLOB_URL=i.createObjectURL(new Blob(["(",r,")();"],{type:"text/javascript"})))),t=new f.Worker(e);var i,r;return t.onmessage=m,t.id=h++,a[t.id]=t}();return r.userStep=t.step,r.userChunk=t.chunk,r.userComplete=t.complete,r.userError=t.error,t.step=U(t.step),t.chunk=U(t.chunk),t.complete=U(t.complete),t.error=U(t.error),delete t.worker,void r.postMessage({input:e,config:t,workerId:r.id})}var n=null;"string"==typeof e?n=t.download?new l(t):new p(t):!0===e.readable&&U(e.read)&&U(e.on)?n=new g(t):(f.File&&e instanceof File||e instanceof Object)&&(n=new c(t));return n.stream(e)},unparse:function(e,t){var n=!1,m=!0,_=",",v="\r\n",s='"',a=s+s,i=!1,r=null,o=!1;!function(){if("object"!=typeof t)return;"string"!=typeof t.delimiter||b.BAD_DELIMITERS.filter(function(e){return -1!==t.delimiter.indexOf(e)}).length||(_=t.delimiter);("boolean"==typeof t.quotes||"function"==typeof t.quotes||Array.isArray(t.quotes))&&(n=t.quotes);"boolean"!=typeof t.skipEmptyLines&&"string"!=typeof t.skipEmptyLines||(i=t.skipEmptyLines);"string"==typeof t.newline&&(v=t.newline);"string"==typeof t.quoteChar&&(s=t.quoteChar);"boolean"==typeof t.header&&(m=t.header);if(Array.isArray(t.columns)){if(0===t.columns.length)throw new Error("Option columns is empty");r=t.columns;}void 0!==t.escapeChar&&(a=t.escapeChar+s);"boolean"==typeof t.escapeFormulae&&(o=t.escapeFormulae);}();var h=new RegExp(q(s),"g");"string"==typeof e&&(e=JSON.parse(e));if(Array.isArray(e)){if(!e.length||Array.isArray(e[0]))return f(null,e,i);if("object"==typeof e[0])return f(r||u(e[0]),e,i)}else if("object"==typeof e)return "string"==typeof e.data&&(e.data=JSON.parse(e.data)),Array.isArray(e.data)&&(e.fields||(e.fields=e.meta&&e.meta.fields),e.fields||(e.fields=Array.isArray(e.data[0])?e.fields:u(e.data[0])),Array.isArray(e.data[0])||"object"==typeof e.data[0]||(e.data=[e.data])),f(e.fields||[],e.data||[],i);throw new Error("Unable to serialize unrecognized input");function u(e){if("object"!=typeof e)return [];var t=[];for(var i in e)t.push(i);return t}function f(e,t,i){var r="";"string"==typeof e&&(e=JSON.parse(e)),"string"==typeof t&&(t=JSON.parse(t));var n=Array.isArray(e)&&0<e.length,s=!Array.isArray(t[0]);if(n&&m){for(var a=0;a<e.length;a++)0<a&&(r+=_),r+=y(e[a],a);0<t.length&&(r+=v);}for(var o=0;o<t.length;o++){var h=n?e.length:t[o].length,u=!1,f=n?0===Object.keys(t[o]).length:0===t[o].length;if(i&&!n&&(u="greedy"===i?""===t[o].join("").trim():1===t[o].length&&0===t[o][0].length),"greedy"===i&&n){for(var d=[],l=0;l<h;l++){var c=s?e[l]:l;d.push(t[o][c]);}u=""===d.join("").trim();}if(!u){for(var p=0;p<h;p++){0<p&&!f&&(r+=_);var g=n&&s?e[p]:p;r+=y(t[o][g],p);}o<t.length-1&&(!i||0<h&&!f)&&(r+=v);}}return r}function y(e,t){if(null==e)return "";if(e.constructor===Date)return JSON.stringify(e).slice(1,25);!0===o&&"string"==typeof e&&null!==e.match(/^[=+\-@].*$/)&&(e="'"+e);var i=e.toString().replace(h,a),r="boolean"==typeof n&&n||"function"==typeof n&&n(e,t)||Array.isArray(n)&&n[t]||function(e,t){for(var i=0;i<t.length;i++)if(-1<e.indexOf(t[i]))return !0;return !1}(i,b.BAD_DELIMITERS)||-1<i.indexOf(_)||" "===i.charAt(0)||" "===i.charAt(i.length-1);return r?s+i+s:i}}};if(b.RECORD_SEP=String.fromCharCode(30),b.UNIT_SEP=String.fromCharCode(31),b.BYTE_ORDER_MARK="\ufeff",b.BAD_DELIMITERS=["\r","\n",'"',b.BYTE_ORDER_MARK],b.WORKERS_SUPPORTED=!n&&!!f.Worker,b.NODE_STREAM_INPUT=1,b.LocalChunkSize=10485760,b.RemoteChunkSize=5242880,b.DefaultDelimiter=",",b.Parser=w,b.ParserHandle=i,b.NetworkStreamer=l,b.FileStreamer=c,b.StringStreamer=p,b.ReadableStreamStreamer=g,f.jQuery){var d=f.jQuery;d.fn.parse=function(o){var i=o.config||{},h=[];return this.each(function(e){if(!("INPUT"===d(this).prop("tagName").toUpperCase()&&"file"===d(this).attr("type").toLowerCase()&&f.FileReader)||!this.files||0===this.files.length)return !0;for(var t=0;t<this.files.length;t++)h.push({file:this.files[t],inputElem:this,instanceConfig:d.extend({},i)});}),e(),this;function e(){if(0!==h.length){var e,t,i,r,n=h[0];if(U(o.before)){var s=o.before(n.file,n.inputElem);if("object"==typeof s){if("abort"===s.action)return e="AbortError",t=n.file,i=n.inputElem,r=s.reason,void(U(o.error)&&o.error({name:e},t,i,r));if("skip"===s.action)return void u();"object"==typeof s.config&&(n.instanceConfig=d.extend(n.instanceConfig,s.config));}else if("skip"===s)return void u()}var a=n.instanceConfig.complete;n.instanceConfig.complete=function(e){U(a)&&a(e,n.file,n.inputElem),u();},b.parse(n.file,n.instanceConfig);}else U(o.complete)&&o.complete();}function u(){h.splice(0,1),e();}};}function u(e){this._handle=null,this._finished=!1,this._completed=!1,this._halted=!1,this._input=null,this._baseIndex=0,this._partialLine="",this._rowCount=0,this._start=0,this._nextChunk=null,this.isFirstChunk=!0,this._completeResults={data:[],errors:[],meta:{}},function(e){var t=E(e);t.chunkSize=parseInt(t.chunkSize),e.step||e.chunk||(t.chunkSize=null);this._handle=new i(t),(this._handle.streamer=this)._config=t;}.call(this,e),this.parseChunk=function(e,t){if(this.isFirstChunk&&U(this._config.beforeFirstChunk)){var i=this._config.beforeFirstChunk(e);void 0!==i&&(e=i);}this.isFirstChunk=!1,this._halted=!1;var r=this._partialLine+e;this._partialLine="";var n=this._handle.parse(r,this._baseIndex,!this._finished);if(!this._handle.paused()&&!this._handle.aborted()){var s=n.meta.cursor;this._finished||(this._partialLine=r.substring(s-this._baseIndex),this._baseIndex=s),n&&n.data&&(this._rowCount+=n.data.length);var a=this._finished||this._config.preview&&this._rowCount>=this._config.preview;if(o)f.postMessage({results:n,workerId:b.WORKER_ID,finished:a});else if(U(this._config.chunk)&&!t){if(this._config.chunk(n,this._handle),this._handle.paused()||this._handle.aborted())return void(this._halted=!0);n=void 0,this._completeResults=void 0;}return this._config.step||this._config.chunk||(this._completeResults.data=this._completeResults.data.concat(n.data),this._completeResults.errors=this._completeResults.errors.concat(n.errors),this._completeResults.meta=n.meta),this._completed||!a||!U(this._config.complete)||n&&n.meta.aborted||(this._config.complete(this._completeResults,this._input),this._completed=!0),a||n&&n.meta.paused||this._nextChunk(),n}this._halted=!0;},this._sendError=function(e){U(this._config.error)?this._config.error(e):o&&this._config.error&&f.postMessage({workerId:b.WORKER_ID,error:e,finished:!1});};}function l(e){var r;(e=e||{}).chunkSize||(e.chunkSize=b.RemoteChunkSize),u.call(this,e),this._nextChunk=n?function(){this._readChunk(),this._chunkLoaded();}:function(){this._readChunk();},this.stream=function(e){this._input=e,this._nextChunk();},this._readChunk=function(){if(this._finished)this._chunkLoaded();else {if(r=new XMLHttpRequest,this._config.withCredentials&&(r.withCredentials=this._config.withCredentials),n||(r.onload=y(this._chunkLoaded,this),r.onerror=y(this._chunkError,this)),r.open(this._config.downloadRequestBody?"POST":"GET",this._input,!n),this._config.downloadRequestHeaders){var e=this._config.downloadRequestHeaders;for(var t in e)r.setRequestHeader(t,e[t]);}if(this._config.chunkSize){var i=this._start+this._config.chunkSize-1;r.setRequestHeader("Range","bytes="+this._start+"-"+i);}try{r.send(this._config.downloadRequestBody);}catch(e){this._chunkError(e.message);}n&&0===r.status&&this._chunkError();}},this._chunkLoaded=function(){4===r.readyState&&(r.status<200||400<=r.status?this._chunkError():(this._start+=this._config.chunkSize?this._config.chunkSize:r.responseText.length,this._finished=!this._config.chunkSize||this._start>=function(e){var t=e.getResponseHeader("Content-Range");if(null===t)return -1;return parseInt(t.substring(t.lastIndexOf("/")+1))}(r),this.parseChunk(r.responseText)));},this._chunkError=function(e){var t=r.statusText||e;this._sendError(new Error(t));};}function c(e){var r,n;(e=e||{}).chunkSize||(e.chunkSize=b.LocalChunkSize),u.call(this,e);var s="undefined"!=typeof FileReader;this.stream=function(e){this._input=e,n=e.slice||e.webkitSlice||e.mozSlice,s?((r=new FileReader).onload=y(this._chunkLoaded,this),r.onerror=y(this._chunkError,this)):r=new FileReaderSync,this._nextChunk();},this._nextChunk=function(){this._finished||this._config.preview&&!(this._rowCount<this._config.preview)||this._readChunk();},this._readChunk=function(){var e=this._input;if(this._config.chunkSize){var t=Math.min(this._start+this._config.chunkSize,this._input.size);e=n.call(e,this._start,t);}var i=r.readAsText(e,this._config.encoding);s||this._chunkLoaded({target:{result:i}});},this._chunkLoaded=function(e){this._start+=this._config.chunkSize,this._finished=!this._config.chunkSize||this._start>=this._input.size,this.parseChunk(e.target.result);},this._chunkError=function(){this._sendError(r.error);};}function p(e){var i;u.call(this,e=e||{}),this.stream=function(e){return i=e,this._nextChunk()},this._nextChunk=function(){if(!this._finished){var e,t=this._config.chunkSize;return t?(e=i.substring(0,t),i=i.substring(t)):(e=i,i=""),this._finished=!i,this.parseChunk(e)}};}function g(e){u.call(this,e=e||{});var t=[],i=!0,r=!1;this.pause=function(){u.prototype.pause.apply(this,arguments),this._input.pause();},this.resume=function(){u.prototype.resume.apply(this,arguments),this._input.resume();},this.stream=function(e){this._input=e,this._input.on("data",this._streamData),this._input.on("end",this._streamEnd),this._input.on("error",this._streamError);},this._checkIsFinished=function(){r&&1===t.length&&(this._finished=!0);},this._nextChunk=function(){this._checkIsFinished(),t.length?this.parseChunk(t.shift()):i=!0;},this._streamData=y(function(e){try{t.push("string"==typeof e?e:e.toString(this._config.encoding)),i&&(i=!1,this._checkIsFinished(),this.parseChunk(t.shift()));}catch(e){this._streamError(e);}},this),this._streamError=y(function(e){this._streamCleanUp(),this._sendError(e);},this),this._streamEnd=y(function(){this._streamCleanUp(),r=!0,this._streamData("");},this),this._streamCleanUp=y(function(){this._input.removeListener("data",this._streamData),this._input.removeListener("end",this._streamEnd),this._input.removeListener("error",this._streamError);},this);}function i(_){var a,o,h,r=Math.pow(2,53),n=-r,s=/^\s*-?(\d+\.?|\.\d+|\d+\.\d+)(e[-+]?\d+)?\s*$/,u=/(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/,t=this,i=0,f=0,d=!1,e=!1,l=[],c={data:[],errors:[],meta:{}};if(U(_.step)){var p=_.step;_.step=function(e){if(c=e,m())g();else {if(g(),0===c.data.length)return;i+=e.data.length,_.preview&&i>_.preview?o.abort():(c.data=c.data[0],p(c,t));}};}function v(e){return "greedy"===_.skipEmptyLines?""===e.join("").trim():1===e.length&&0===e[0].length}function g(){if(c&&h&&(k("Delimiter","UndetectableDelimiter","Unable to auto-detect delimiting character; defaulted to '"+b.DefaultDelimiter+"'"),h=!1),_.skipEmptyLines)for(var e=0;e<c.data.length;e++)v(c.data[e])&&c.data.splice(e--,1);return m()&&function(){if(!c)return;function e(e,t){U(_.transformHeader)&&(e=_.transformHeader(e,t)),l.push(e);}if(Array.isArray(c.data[0])){for(var t=0;m()&&t<c.data.length;t++)c.data[t].forEach(e);c.data.splice(0,1);}else c.data.forEach(e);}(),function(){if(!c||!_.header&&!_.dynamicTyping&&!_.transform)return c;function e(e,t){var i,r=_.header?{}:[];for(i=0;i<e.length;i++){var n=i,s=e[i];_.header&&(n=i>=l.length?"__parsed_extra":l[i]),_.transform&&(s=_.transform(s,n)),s=y(n,s),"__parsed_extra"===n?(r[n]=r[n]||[],r[n].push(s)):r[n]=s;}return _.header&&(i>l.length?k("FieldMismatch","TooManyFields","Too many fields: expected "+l.length+" fields but parsed "+i,f+t):i<l.length&&k("FieldMismatch","TooFewFields","Too few fields: expected "+l.length+" fields but parsed "+i,f+t)),r}var t=1;!c.data.length||Array.isArray(c.data[0])?(c.data=c.data.map(e),t=c.data.length):c.data=e(c.data,0);_.header&&c.meta&&(c.meta.fields=l);return f+=t,c}()}function m(){return _.header&&0===l.length}function y(e,t){return i=e,_.dynamicTypingFunction&&void 0===_.dynamicTyping[i]&&(_.dynamicTyping[i]=_.dynamicTypingFunction(i)),!0===(_.dynamicTyping[i]||_.dynamicTyping)?"true"===t||"TRUE"===t||"false"!==t&&"FALSE"!==t&&(function(e){if(s.test(e)){var t=parseFloat(e);if(n<t&&t<r)return !0}return !1}(t)?parseFloat(t):u.test(t)?new Date(t):""===t?null:t):t;var i;}function k(e,t,i,r){var n={type:e,code:t,message:i};void 0!==r&&(n.row=r),c.errors.push(n);}this.parse=function(e,t,i){var r=_.quoteChar||'"';if(_.newline||(_.newline=function(e,t){e=e.substring(0,1048576);var i=new RegExp(q(t)+"([^]*?)"+q(t),"gm"),r=(e=e.replace(i,"")).split("\r"),n=e.split("\n"),s=1<n.length&&n[0].length<r[0].length;if(1===r.length||s)return "\n";for(var a=0,o=0;o<r.length;o++)"\n"===r[o][0]&&a++;return a>=r.length/2?"\r\n":"\r"}(e,r)),h=!1,_.delimiter)U(_.delimiter)&&(_.delimiter=_.delimiter(e),c.meta.delimiter=_.delimiter);else {var n=function(e,t,i,r,n){var s,a,o,h;n=n||[",","\t","|",";",b.RECORD_SEP,b.UNIT_SEP];for(var u=0;u<n.length;u++){var f=n[u],d=0,l=0,c=0;o=void 0;for(var p=new w({comments:r,delimiter:f,newline:t,preview:10}).parse(e),g=0;g<p.data.length;g++)if(i&&v(p.data[g]))c++;else {var m=p.data[g].length;l+=m,void 0!==o?0<m&&(d+=Math.abs(m-o),o=m):o=m;}0<p.data.length&&(l/=p.data.length-c),(void 0===a||d<=a)&&(void 0===h||h<l)&&1.99<l&&(a=d,s=f,h=l);}return {successful:!!(_.delimiter=s),bestDelimiter:s}}(e,_.newline,_.skipEmptyLines,_.comments,_.delimitersToGuess);n.successful?_.delimiter=n.bestDelimiter:(h=!0,_.delimiter=b.DefaultDelimiter),c.meta.delimiter=_.delimiter;}var s=E(_);return _.preview&&_.header&&s.preview++,a=e,o=new w(s),c=o.parse(a,t,i),g(),d?{meta:{paused:!0}}:c||{meta:{paused:!1}}},this.paused=function(){return d},this.pause=function(){d=!0,o.abort(),a=U(_.chunk)?"":a.substring(o.getCharIndex());},this.resume=function(){t.streamer._halted?(d=!1,t.streamer.parseChunk(a,!0)):setTimeout(t.resume,3);},this.aborted=function(){return e},this.abort=function(){e=!0,o.abort(),c.meta.aborted=!0,U(_.complete)&&_.complete(c),a="";};}function q(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function w(e){var O,D=(e=e||{}).delimiter,I=e.newline,T=e.comments,A=e.step,L=e.preview,F=e.fastMode,z=O=void 0===e.quoteChar?'"':e.quoteChar;if(void 0!==e.escapeChar&&(z=e.escapeChar),("string"!=typeof D||-1<b.BAD_DELIMITERS.indexOf(D))&&(D=","),T===D)throw new Error("Comment character same as delimiter");!0===T?T="#":("string"!=typeof T||-1<b.BAD_DELIMITERS.indexOf(T))&&(T=!1),"\n"!==I&&"\r"!==I&&"\r\n"!==I&&(I="\n");var M=0,j=!1;this.parse=function(a,t,i){if("string"!=typeof a)throw new Error("Input must be a string");var r=a.length,e=D.length,n=I.length,s=T.length,o=U(A),h=[],u=[],f=[],d=M=0;if(!a)return R();if(F||!1!==F&&-1===a.indexOf(O)){for(var l=a.split(I),c=0;c<l.length;c++){if(f=l[c],M+=f.length,c!==l.length-1)M+=I.length;else if(i)return R();if(!T||f.substring(0,s)!==T){if(o){if(h=[],b(f.split(D)),S(),j)return R()}else b(f.split(D));if(L&&L<=c)return h=h.slice(0,L),R(!0)}}return R()}for(var p=a.indexOf(D,M),g=a.indexOf(I,M),m=new RegExp(q(z)+q(O),"g"),_=a.indexOf(O,M);;)if(a[M]!==O)if(T&&0===f.length&&a.substring(M,M+s)===T){if(-1===g)return R();M=g+n,g=a.indexOf(I,M),p=a.indexOf(D,M);}else {if(-1!==p&&(p<g||-1===g)){if(!(p<_)){f.push(a.substring(M,p)),M=p+e,p=a.indexOf(D,M);continue}var v=x(p,_,g);if(v&&void 0!==v.nextDelim){p=v.nextDelim,_=v.quoteSearch,f.push(a.substring(M,p)),M=p+e,p=a.indexOf(D,M);continue}}if(-1===g)break;if(f.push(a.substring(M,g)),C(g+n),o&&(S(),j))return R();if(L&&h.length>=L)return R(!0)}else for(_=M,M++;;){if(-1===(_=a.indexOf(O,_+1)))return i||u.push({type:"Quotes",code:"MissingQuotes",message:"Quoted field unterminated",row:h.length,index:M}),E();if(_===r-1)return E(a.substring(M,_).replace(m,O));if(O!==z||a[_+1]!==z){if(O===z||0===_||a[_-1]!==z){-1!==p&&p<_+1&&(p=a.indexOf(D,_+1)),-1!==g&&g<_+1&&(g=a.indexOf(I,_+1));var y=w(-1===g?p:Math.min(p,g));if(a[_+1+y]===D){f.push(a.substring(M,_).replace(m,O)),a[M=_+1+y+e]!==O&&(_=a.indexOf(O,M)),p=a.indexOf(D,M),g=a.indexOf(I,M);break}var k=w(g);if(a.substring(_+1+k,_+1+k+n)===I){if(f.push(a.substring(M,_).replace(m,O)),C(_+1+k+n),p=a.indexOf(D,M),_=a.indexOf(O,M),o&&(S(),j))return R();if(L&&h.length>=L)return R(!0);break}u.push({type:"Quotes",code:"InvalidQuotes",message:"Trailing quote on quoted field is malformed",row:h.length,index:M}),_++;}}else _++;}return E();function b(e){h.push(e),d=M;}function w(e){var t=0;if(-1!==e){var i=a.substring(_+1,e);i&&""===i.trim()&&(t=i.length);}return t}function E(e){return i||(void 0===e&&(e=a.substring(M)),f.push(e),M=r,b(f),o&&S()),R()}function C(e){M=e,b(f),f=[],g=a.indexOf(I,M);}function R(e){return {data:h,errors:u,meta:{delimiter:D,linebreak:I,aborted:j,truncated:!!e,cursor:d+(t||0)}}}function S(){A(R()),h=[],u=[];}function x(e,t,i){var r={nextDelim:void 0,quoteSearch:void 0},n=a.indexOf(O,t+1);if(t<e&&e<n&&(n<i||-1===i)){var s=a.indexOf(D,n);if(-1===s)return r;n<s&&(n=a.indexOf(O,n+1)),r=x(s,n,i);}else r={nextDelim:e,quoteSearch:t};return r}},this.abort=function(){j=!0;},this.getCharIndex=function(){return M};}function m(e){var t=e.data,i=a[t.workerId],r=!1;if(t.error)i.userError(t.error,t.file);else if(t.results&&t.results.data){var n={abort:function(){r=!0,_(t.workerId,{data:[],errors:[],meta:{aborted:!0}});},pause:v,resume:v};if(U(i.userStep)){for(var s=0;s<t.results.data.length&&(i.userStep({data:t.results.data[s],errors:t.results.errors,meta:t.results.meta},n),!r);s++);delete t.results;}else U(i.userChunk)&&(i.userChunk(t.results,n,t.file),delete t.results);}t.finished&&!r&&_(t.workerId,t.results);}function _(e,t){var i=a[e];U(i.userComplete)&&i.userComplete(t),i.terminate(),delete a[e];}function v(){throw new Error("Not implemented.")}function E(e){if("object"!=typeof e||null===e)return e;var t=Array.isArray(e)?[]:{};for(var i in e)t[i]=E(e[i]);return t}function y(e,t){return function(){e.apply(t,arguments);}}function U(e){return "function"==typeof e}return o&&(f.onmessage=function(e){var t=e.data;void 0===b.WORKER_ID&&t&&(b.WORKER_ID=t.workerId);if("string"==typeof t.input)f.postMessage({workerId:b.WORKER_ID,results:b.parse(t.input,t.config),finished:!0});else if(f.File&&t.input instanceof File||t.input instanceof Object){var i=b.parse(t.input,t.config);i&&f.postMessage({workerId:b.WORKER_ID,results:i,finished:!0});}}),(l.prototype=Object.create(u.prototype)).constructor=l,(c.prototype=Object.create(u.prototype)).constructor=c,(p.prototype=Object.create(p.prototype)).constructor=p,(g.prototype=Object.create(u.prototype)).constructor=g,b});
    });

    /* src\App.svelte generated by Svelte v3.24.1 */

    const { Error: Error_1 } = globals;
    const file$2 = "src\\App.svelte";

    // (52:0) {:catch error}
    function create_catch_block(ctx) {
    	let p;
    	let t_value = /*error*/ ctx[6].message + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			set_style(p, "color", "red");
    			add_location(p, file$2, 52, 1, 1830);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(52:0) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (48:0) {:then values}
    function create_then_block(ctx) {
    	let networkoverview;
    	let t;
    	let dynamicnetwork;
    	let current;

    	networkoverview = new NetworkOverview({
    			props: { trans: /*values*/ ctx[5][1] },
    			$$inline: true
    		});

    	dynamicnetwork = new DynamicNetwork({
    			props: { trans: /*values*/ ctx[5][1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(networkoverview.$$.fragment);
    			t = space();
    			create_component(dynamicnetwork.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(networkoverview, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(dynamicnetwork, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(networkoverview.$$.fragment, local);
    			transition_in(dynamicnetwork.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(networkoverview.$$.fragment, local);
    			transition_out(dynamicnetwork.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(networkoverview, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(dynamicnetwork, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(48:0) {:then values}",
    		ctx
    	});

    	return block;
    }

    // (46:16)   <p>...waiting</p> {:then values}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "...waiting";
    			add_location(p, file$2, 46, 1, 1703);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(46:16)   <p>...waiting</p> {:then values}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let await_block_anchor;
    	let promise_1;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 5,
    		error: 6,
    		blocks: [,,,]
    	};

    	handle_promise(promise_1 = /*promise*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[5] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	let promise = Promise.all([readAccount(), readTrans()]).then(values => {
    		return values;
    	});

    	let urls = ["./data/trans.csv", "./data/accounts.csv"];

    	function readTrans() {
    		return __awaiter(this, void 0, void 0, function* () {
    			const res = yield fetch("./data/real.json");
    			const json = yield res.json();

    			if (res.ok) {
    				return json;
    			} else {
    				throw new Error(json);
    			}
    		});
    	}

    	function readAccount() {
    		return __awaiter(this, void 0, void 0, function* () {
    			const res = yield fetch("./data/accounts.json");
    			const json = yield res.json();

    			if (res.ok) {
    				return json;
    			} else {
    				throw new Error(json);
    			}
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		__awaiter,
    		DynamicNetwork,
    		NetworkOverview,
    		Papa: papaparse_min,
    		promise,
    		urls,
    		readTrans,
    		readAccount
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("promise" in $$props) $$invalidate(0, promise = $$props.promise);
    		if ("urls" in $$props) urls = $$props.urls;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [promise];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
