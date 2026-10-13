// "use client";

// import { useEffect, useState } from "react";
// import { supabase } from "./supabase";
// import { demoCollections } from "./demo-data";
// import { Collection } from "./types";

// export function useCollections() {
//   const [collections, setCollections] = useState<Collection[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     let alive = true;
//     async function load() {
//       if (!supabase) {
//         await new Promise((r) => setTimeout(r, 700));
//         if (alive) {
//           setCollections(demoCollections);
//           setLoading(false);
//         }
//         return;
//       }
//       const { data, error } = await supabase
//         .from("collections")
//         .select("*")
//         .order("created_at", { ascending: false });
//       if (!alive) return;
//     }
//     load();
//     return () => {
//       alive = false;
//     };
//   }, []);

//   return { collections, loading };
// }

"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { demoCollections } from "./demo-data";
import { Collection } from "./types";

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        if (!supabase) {
          setCollections(demoCollections);
          return;
        }

        const { data, error } = await supabase
          .from("collections")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (alive) {
          setCollections(data ?? []);
        }
      } catch (err) {
        console.error("Error cargando colecciones:", err);

        if (alive) {
          setError("No fue posible cargar las colecciones.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  return { collections, loading, error };
}
