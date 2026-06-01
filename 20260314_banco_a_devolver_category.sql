INSERT INTO public.categories (name, type)
SELECT 'Banco a Devolver', 'out'
WHERE NOT EXISTS (
    SELECT 1 FROM public.categories WHERE name = 'Banco a Devolver'
);
