/* ============================================
   Supabase Client - Connection Configuration
   ============================================ */

var SupabaseClient = (function() {
  var SUPABASE_URL = 'https://ikwpahmyroaowdxfhrtq.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_MouplvTK50ON45gfPZ0IWQ_Wy9Wwt41';

  var client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  return {
    client: client,
    auth: client.auth,
    from: function(table) { return client.from(table); },
    storage: client.storage,
    rpc: function(fn, params) { return client.rpc(fn, params); }
  };
})();
