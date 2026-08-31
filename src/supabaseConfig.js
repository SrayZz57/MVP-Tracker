// Partagé entre le renderer (src/renderer/supabaseClient.js, session utilisateur)
// et le process principal (src/services/matchSync.js, écrit avec le jeton de
// cette session), un seul endroit à mettre à jour si la clé change un jour.
//
// La clé "anon public" est faite pour être embarquée côté client, la vraie
// sécurité des données vient des règles RLS configurées côté Supabase, pas
// du secret de cette clé (voir la doc Supabase sur ce point).
export const SUPABASE_URL = 'https://hbfqtrqztyrnsqrrvmep.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZnF0cnF6dHlybnNxcnJ2bWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNzk4OTcsImV4cCI6MjEwMjY1NTg5N30.OtQG46T7kwSC6s3l8CNE0Jq7RTAL34tn4HVQl_4Fu_k';
