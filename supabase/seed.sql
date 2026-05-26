-- Optional seed data. Run AFTER you have at least one admin user
-- (sign up + `update profiles set role = 'admin' where email = '...'`).
--
-- Each `flag` column stores ONLY the body. The event's flag_prefix is applied
-- at submit time, so the same library challenge works under any prefix.
-- Descriptions are written to be format-agnostic.
-- Re-runnable: `on conflict (slug) do nothing`.

insert into challenges
  (title,              slug,              description, category,    difficulty, points, type,     flag,                              is_active)
values
  -- ===== misc =====
  ('Welcome',          'welcome',
   'The flag body is right here in the description: hello_world. Wrap it with your event''s flag prefix and submit.',
   'misc', 'easy', 50, 'static', 'hello_world', true),

  ('Morse Code',       'morse-code',
   E'Decode this Morse to get the flag body, then wrap with your event''s prefix:\n\n-- --- .-. ... .',
   'misc', 'easy', 100, 'static', 'morse', true),

  ('Binary Talk',      'binary-talk',
   E'Convert this binary to ASCII to get the flag body, then wrap with your event''s prefix:\n\n00110001 00110000 00110001',
   'misc', 'easy', 100, 'static', '101', true),

  ('Programming Puzzle','programming-puzzle',
   'Compute fib(20) where fib(0)=0, fib(1)=1. The result is your flag body — wrap with your event''s prefix.',
   'misc', 'medium', 200, 'static', '6765', true),

  -- ===== web =====
  ('Robots',           'robots',
   'Sometimes the flag hides in plain sight. Check the rules of robots.',
   'web', 'easy', 100, 'static', 'check_robots_txt', true),

  ('Hidden Field',     'hidden-field',
   'View source. There is a hidden input with value `view_source_4ever` — wrap with your event''s prefix and submit.',
   'web', 'easy', 100, 'static', 'view_source_4ever', true),

  ('Cookie Monster',   'cookie-monster',
   'Inspect your cookies on the demo site. One of them tastes... different.',
   'web', 'medium', 200, 'static', 'cookies_arent_just_for_sessions', true),

  ('SQLi 101',         'sqli-101',
   E'The login form accepts the classic payload:  '' OR 1=1 --\nThe flag body is `or_1_equals_1` — wrap with your event''s prefix.',
   'web', 'medium', 250, 'static', 'or_1_equals_1', true),

  ('JWT None',         'jwt-none',
   'A JWT verifier accepts alg=none. Why is that dangerous? Flag body: `never_trust_alg_none` — wrap with your event''s prefix.',
   'web', 'hard', 400, 'static', 'never_trust_alg_none', true),

  -- ===== crypto =====
  ('Base What?',       'base-what',
   E'Decode this base64 to get the flag body, then wrap with your event''s prefix:\n\nYmFzZTY0X2lzX25vdF9lbmNyeXB0aW9u',
   'crypto', 'easy', 100, 'static', 'base64_is_not_encryption', true),

  ('Caesar Salad',     'caesar-salad',
   E'Decode this Caesar (shift 3) to get the flag body, then wrap with your event''s prefix:\n\nfdhvdu_lv_fodvvlf',
   'crypto', 'medium', 200, 'static', 'caesar_is_classic', true),

  ('ROT47',            'rot47',
   E'Decode this ROT47 to get the flag body, then wrap with your event''s prefix:\n\nC@Ecf0:D0DE:==0426D2C',
   'crypto', 'easy', 150, 'static', 'rot47_is_still_caesar', true),

  ('XOR Magic',        'xor-magic',
   E'Key: "ctf" (the encryption key, NOT the flag prefix).\nCiphertext (hex): 09 01 15 17 2b 1e 0c 06 39 0a 00\nXOR to decode → that''s the flag body. Wrap with your event''s prefix.',
   'crypto', 'medium', 250, 'static', 'just_xor_it', true),

  ('Small RSA',        'small-rsa',
   'Given n=3233, e=17, c=855. Recover m. The integer m is your flag body — wrap with your event''s prefix.',
   'crypto', 'hard', 400, 'static', '65', true),

  -- ===== forensics =====
  ('EXIF Hunter',      'exif-hunter',
   'Image metadata can leak a lot. Imagine a .jpg whose EXIF Comment is `exif_data_is_revealing`. That string is your flag body — wrap with your event''s prefix.',
   'forensics', 'easy', 100, 'static', 'exif_data_is_revealing', true),

  ('Strings',          'strings-binary',
   'Running `strings ./binary` on the attached file would reveal the body: `strings_command_for_the_win`. Wrap with your event''s prefix.',
   'forensics', 'easy', 100, 'static', 'strings_command_for_the_win', true),

  ('PCAP Hunt',        'pcap-hunt',
   'Filter the capture for `http.request.method == POST`. The flag was sent in clear text.',
   'forensics', 'medium', 250, 'static', 'wireshark_filters_save_lives', true),

  ('Stego LSB',        'stego-lsb',
   'PNG with a flag hidden in the least-significant bits of the red channel. Tools like zsteg/stegsolve reveal it.',
   'forensics', 'hard', 400, 'static', 'least_significant_bits_hide_a_lot', true),

  -- ===== pwn =====
  ('Buffer Overflow 101','bof-101',
   'A 32-byte buffer with no canary, no NX. Overflow it past the saved return to call win(). Conceptual flag body: `smash_the_stack` — wrap with your event''s prefix.',
   'pwn', 'easy', 150, 'static', 'smash_the_stack', true),

  ('Format String',    'format-string',
   'printf(user_input) without a format specifier. %x leaks memory; %n writes. Conceptual flag body: `format_strings_leak_memory` — wrap with your event''s prefix.',
   'pwn', 'medium', 300, 'static', 'format_strings_leak_memory', true),

  ('ROP Chain',        'rop-chain',
   'NX is on, ASLR off. Find gadgets in libc, chain a syscall. Conceptual flag body: `return_oriented_programming` — wrap with your event''s prefix.',
   'pwn', 'hard', 500, 'static', 'return_oriented_programming', true)
on conflict (slug) do nothing;
