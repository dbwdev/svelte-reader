
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
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
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.3' }, detail)));
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
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

    /* src/Reader.svelte generated by Svelte v3.22.3 */

    const { console: console_1 } = globals;
    const file = "src/Reader.svelte";

    function create_fragment(ctx) {
    	let div3;
    	let span;
    	let t0;
    	let t1;
    	let div2;
    	let div0;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let p0;
    	let t8;
    	let p1;
    	let t11;
    	let p2;
    	let t14;
    	let textarea;
    	let t15;
    	let div1;
    	let button2;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			span = element("span");
    			t0 = text(/*word*/ ctx[0]);
    			t1 = space();
    			div2 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "+ Speed";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "- Speed";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = `X is ${/*acl*/ ctx[2].x}`;
    			t8 = space();
    			p1 = element("p");
    			p1.textContent = `Y is ${/*acl*/ ctx[2].y}`;
    			t11 = space();
    			p2 = element("p");
    			p2.textContent = `Z is ${/*acl*/ ctx[2].z}`;
    			t14 = space();
    			textarea = element("textarea");
    			t15 = space();
    			div1 = element("div");
    			button2 = element("button");
    			button2.textContent = "Start";
    			attr_dev(span, "class", "word svelte-smsjmo");
    			add_location(span, file, 76, 2, 1395);
    			add_location(button0, file, 79, 6, 1495);
    			add_location(button1, file, 80, 6, 1551);
    			attr_dev(div0, "class", "button-group");
    			add_location(div0, file, 78, 4, 1462);
    			add_location(p0, file, 83, 4, 1617);
    			add_location(p1, file, 84, 4, 1641);
    			add_location(p2, file, 85, 4, 1665);
    			add_location(textarea, file, 86, 4, 1689);
    			add_location(button2, file, 89, 6, 1767);
    			add_location(div1, file, 88, 4, 1755);
    			attr_dev(div2, "class", "control-group svelte-smsjmo");
    			add_location(div2, file, 77, 2, 1430);
    			attr_dev(div3, "class", "container svelte-smsjmo");
    			add_location(div3, file, 75, 0, 1369);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, span);
    			append_dev(span, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t3);
    			append_dev(div0, button1);
    			append_dev(div2, t5);
    			append_dev(div2, p0);
    			append_dev(div2, t8);
    			append_dev(div2, p1);
    			append_dev(div2, t11);
    			append_dev(div2, p2);
    			append_dev(div2, t14);
    			append_dev(div2, textarea);
    			append_dev(div2, t15);
    			append_dev(div2, div1);
    			append_dev(div1, button2);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", /*increaseSpeed*/ ctx[4], false, false, false),
    				listen_dev(button1, "click", /*decreaseSpeed*/ ctx[5], false, false, false),
    				listen_dev(textarea, "change", /*change_handler*/ ctx[8], false, false, false),
    				listen_dev(button2, "click", /*startReading*/ ctx[3], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*word*/ 1) set_data_dev(t0, /*word*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			run_all(dispose);
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

    const MIN_SPEED = 1000;
    const MAX_SPEED = 50;

    function instance($$self, $$props, $$invalidate) {
    	let acl = new Accelerometer({ frequency: 60 });

    	acl.addEventListener("reading", () => {
    		console.log("Acceleration along the X-axis " + acl.x);
    		console.log("Acceleration along the Y-axis " + acl.y);
    		console.log("Acceleration along the Z-axis " + acl.z);
    	});

    	acl.start();
    	let word = "";
    	let speed = 200;
    	let articleText = "";

    	function startReading() {
    		if (!articleText) alert("You need to enter some text!");
    		renderWord(articleText.split(" ").reverse());
    	}

    	function renderWord(array) {
    		const arrayCopy = [...array];

    		function selectWord() {
    			const currWord = arrayCopy.pop();
    			if (currWord) $$invalidate(0, word = currWord); else $$invalidate(0, word = "END");
    			setTimeout(selectWord, speed);
    		}

    		setTimeout(selectWord(), speed);
    	}

    	function increaseSpeed() {
    		if (speed >= MAX_SPEED) speed -= 50;
    	}

    	function decreaseSpeed() {
    		if (speed <= MIN_SPEED) speed += 50;
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Reader> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Reader", $$slots, []);
    	const change_handler = e => $$invalidate(1, articleText = e.target.value);

    	$$self.$capture_state = () => ({
    		onMount,
    		acl,
    		MIN_SPEED,
    		MAX_SPEED,
    		word,
    		speed,
    		articleText,
    		startReading,
    		renderWord,
    		increaseSpeed,
    		decreaseSpeed
    	});

    	$$self.$inject_state = $$props => {
    		if ("acl" in $$props) $$invalidate(2, acl = $$props.acl);
    		if ("word" in $$props) $$invalidate(0, word = $$props.word);
    		if ("speed" in $$props) speed = $$props.speed;
    		if ("articleText" in $$props) $$invalidate(1, articleText = $$props.articleText);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		word,
    		articleText,
    		acl,
    		startReading,
    		increaseSpeed,
    		decreaseSpeed,
    		speed,
    		renderWord,
    		change_handler
    	];
    }

    class Reader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Reader",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.22.3 */
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let span;
    	let t2;
    	let a;
    	let t4;
    	let current;
    	const reader = new Reader({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Svelte Speed Reader";
    			t1 = space();
    			span = element("span");
    			t2 = text("Made by ");
    			a = element("a");
    			a.textContent = "@dbwdev";
    			t4 = space();
    			create_component(reader.$$.fragment);
    			attr_dev(h1, "class", "svelte-94he2j");
    			add_location(h1, file$1, 5, 2, 69);
    			attr_dev(a, "href", "https://twitter.com/dbwdev");
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$1, 6, 31, 129);
    			attr_dev(span, "class", "byline");
    			add_location(span, file$1, 6, 2, 100);
    			attr_dev(main, "class", "svelte-94he2j");
    			add_location(main, file$1, 4, 0, 60);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, span);
    			append_dev(span, t2);
    			append_dev(span, a);
    			append_dev(main, t4);
    			mount_component(reader, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(reader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(reader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(reader);
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
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ Reader });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
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
