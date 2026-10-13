(() => {
  const Core = window.AECloudCore;
  const localHost = ["localhost", "127.0.0.1", ""].includes(location.hostname);
  const config = window.AE_FIREBASE;
  let sdk, auth, db, callbacks, model, user = null, stop = null, generation = 0;
  let status = config ? "starting" : "unconfigured", error = "", ready = false, busy = false, timer;
  let candidate = null, candidateAvailable = false, lastSaved = null;
  const listeners = [];
  const info = () => ({ configured: !!config, localHost, user: user && { uid: user.uid, email: user.email }, status, error,
    pending: model?.count() || 0, candidate: candidateAvailable, lastSaved, ready });
  const emit = () => listeners.forEach(fn => fn(info()));
  const fail = e => { error = e.message || String(e); status = "error"; emit(); };
  const cacheKey = uid => "ae-cloud-cache:" + config.projectId + ":" + uid;
  const readCache = uid => {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || !value.records || !value.pending) throw Error("The cloud cache is unreadable. Export your data before clearing site storage.");
    Core.unpack(value.records, callbacks.empty());
    return value;
  };
  const persist = () => {
    if (model && user) localStorage.setItem(cacheKey(user.uid), JSON.stringify({ records: model.view, pending: model.pending }));
  };
  const show = () => callbacks.apply(Core.unpack(model.view, callbacks.empty()), user.uid);
  const setStatus = () => {
    status = !navigator.onLine ? "offline" : !ready ? "connecting" : model?.count() ? "saving" : "synced";
    error = ""; emit();
  };
  async function documentId(k) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(k));
    return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  async function flush() {
    clearTimeout(timer);
    if (!user || !model || !ready || busy || !navigator.onLine || !model.count()) return;
    const ownGeneration = generation, ownModel = model, ownUser = user;
    busy = true; setStatus();
    try {
      while (ownGeneration === generation && ownModel.count() && navigator.onLine) {
        const entries = Object.entries(ownModel.pending).slice(0, 400);
        const ids = await Promise.all(entries.map(([k]) => documentId(k)));
        if (ownGeneration !== generation) return;
        const batch = sdk.writeBatch(db);
        entries.forEach(([k, change], i) => {
          // 500KB leaves ample room below Firestore's 1MiB document limit, including encoding overhead.
          if (change.value && new TextEncoder().encode(change.value).length > 500000) throw Error("This entry is too large for cloud saving. Split it into smaller notes; your local copy is retained.");
          batch.set(sdk.doc(db, "users", ownUser.uid, "records", ids[i]), { key: k, value: change.value, mutation: change.mutation });
        });
        await batch.commit();
        if (ownGeneration !== generation) return;
        ownModel.ack(Object.fromEntries(entries.map(([k, change]) => [k, change.mutation])));
        persist(); lastSaved = new Date();
      }
      if (ownGeneration === generation) setStatus();
    } catch (e) { if (ownGeneration === generation) fail(e); }
    finally { if (ownGeneration === generation) busy = false; }
  }
  function schedule(state) {
    if (!model || !user) return;
    try {
      model.edit(Core.pack(state)); persist(); setStatus();
      clearTimeout(timer); timer = setTimeout(flush, 650);
    } catch (e) { fail(e); }
  }
  async function account(next) {
    generation++; const ownGeneration = generation;
    clearTimeout(timer); stop?.(); stop = null; ready = false; busy = false; model = null;
    user = next; error = ""; candidateAvailable = false;
    if (!next) { status = "signed-out"; callbacks.signedOut(); emit(); return; }
    if (config.ownerEmail && next.email?.toLowerCase() !== config.ownerEmail.toLowerCase()) {
      user = null; await sdk.signOut(auth); fail(Error("Sign in with the Google account that owns this tracker.")); return;
    }
    try {
      const cached = readCache(next.uid);
      model = new Core.Model(cached?.records || {}, cached?.pending || {});
      callbacks.account(next.uid);
      show(); setStatus();
      stop = sdk.onSnapshot(sdk.collection(db, "users", next.uid, "records"), { includeMetadataChanges: true }, snapshot => {
        if (ownGeneration !== generation) return;
        try {
          const records = {}, ack = {};
          snapshot.forEach(doc => {
            const r = doc.data();
            if (typeof r.key !== "string" || !(typeof r.value === "string" || r.value === null)) throw Error("An invalid record was found in your cloud data.");
            records[r.key] = r.value;
            if (!doc.metadata.hasPendingWrites && !snapshot.metadata.fromCache) ack[r.key] = r.mutation;
          });
          // An empty offline cache is not evidence that the remote tracker is empty.
          if (snapshot.metadata.fromCache && !ready) { setStatus(); return; }
          const first = !ready;
          if (!snapshot.metadata.fromCache) ready = true;
          model.receive(records, ack);
          if (first && ready && snapshot.empty && !cached && candidate && callbacks.hasData(candidate)) {
            model.edit(Core.pack(candidate)); // First migration happens only into an empty account.
          } else if (first && candidate && callbacks.hasData(candidate)) candidateAvailable = true;
          persist(); show(); setStatus();
          if (!snapshot.metadata.fromCache) void flush();
        } catch (e) { fail(e); }
      }, e => { if (ownGeneration === generation) fail(e); });
    } catch (e) { fail(e); }
  }
  async function init(hooks) {
    callbacks = hooks;
    if (!config) { emit(); return; }
    candidate = structuredClone(hooks.current());
    emit();
    try {
      const base = "https://www.gstatic.com/firebasejs/12.19.0/";
      const [app, authentication, firestore] = await Promise.all([
        import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-firestore.js")
      ]);
      sdk = { ...authentication, ...firestore };
      const firebaseApp = app.initializeApp(config);
      auth = sdk.getAuth(firebaseApp); db = sdk.getFirestore(firebaseApp);
      // Emulators are allowed only on localhost, never by a query parameter on the hosted app.
      if (localHost && config.emulators) {
        sdk.connectAuthEmulator(auth, "http://127.0.0.1:" + config.emulators.auth, { disableWarnings: true });
        sdk.connectFirestoreEmulator(db, "127.0.0.1", config.emulators.firestore);
      }
      await sdk.setPersistence(auth, sdk.browserLocalPersistence);
      sdk.onAuthStateChanged(auth, next => void account(next), fail);
      await sdk.getRedirectResult(auth);
    } catch (e) { fail(e); }
  }
  async function signIn() {
    if (!auth) throw Error("Cloud sign-in is not ready. Try again in a moment.");
    const provider = new sdk.GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" });
    // Popups avoid redirect-storage restrictions on iOS; fall back when the browser blocks the popup.
    try { await sdk.signInWithPopup(auth, provider); }
    catch (e) {
      if (e.code === "auth/popup-blocked") return sdk.signInWithRedirect(auth, provider);
      if (!["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(e.code)) throw e;
    }
  }
  async function signOut() {
    if (model?.count()) throw Error("There are changes waiting to sync. Reconnect and wait for “Cloud saved” before signing out.");
    await sdk.signOut(auth);
  }
  function importLocal() {
    if (!ready || !model || !candidateAvailable) return;
    const incoming = Core.pack(candidate), merged = { ...model.view };
    // Keep cloud versions of conflicts; existing cloud tombstones also prevent resurrection.
    for (const [k, value] of Object.entries(incoming)) if (!(k in model.remote) && !(k in merged)) merged[k] = value;
    model.edit(merged); persist(); candidateAvailable = false; show(); setStatus(); void flush();
  }
  window.addEventListener("online", () => { if (user) { setStatus(); void flush(); } });
  window.addEventListener("offline", () => { if (user) setStatus(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && user) { try { persist(); void flush(); } catch (e) { fail(e); } } });
  window.AECloud = { init, info, schedule, flush, retry: () => status === "error" && auth?.currentUser ? account(auth.currentUser) : flush(), signIn, signOut, importLocal, on: fn => listeners.push(fn),
    stateKey: uid => "ae-prep-tracker-cloud:" + config.projectId + ":" + uid };
})();
