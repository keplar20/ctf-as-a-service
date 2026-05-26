-- Update seed challenge descriptions to remove hardcoded "ctf{...}" references.
-- After migration 0012, the stored `flag` is just the body; the event's prefix
-- is applied at submit time. So the descriptions shouldn't tell players to
-- submit a specific prefix like "ctf".
--
-- Encoded challenges (Morse, Binary, Base64, Caesar, ROT47, XOR) are re-encoded
-- to encode only the body so decoding gives the body directly.
--
-- Safe to re-run; only updates rows by slug.

-- --- misc ---
update challenges set
  description = 'The flag body is right here in the description: hello_world. Wrap it with your event''s flag prefix and submit.'
  where slug = 'welcome';

update challenges set
  description = E'Decode this Morse to get the flag body, then wrap with your event''s prefix:\n\n-- --- .-. ... .'
  where slug = 'morse-code';

update challenges set
  description = E'Convert this binary to ASCII to get the flag body, then wrap with your event''s prefix:\n\n00110001 00110000 00110001'
  where slug = 'binary-talk';

update challenges set
  description = 'Compute fib(20) where fib(0)=0, fib(1)=1. The result is your flag body — wrap with your event''s prefix.'
  where slug = 'programming-puzzle';

-- --- web ---
-- robots: description doesn't mention ctf — leave as-is
update challenges set
  description = 'View source. There is a hidden input with value `view_source_4ever` — wrap with your event''s prefix and submit.'
  where slug = 'hidden-field';

-- cookie-monster: doesn't mention ctf — leave as-is
update challenges set
  description = E'The login form accepts the classic payload:  '' OR 1=1 --\nThe flag body is `or_1_equals_1` — wrap with your event''s prefix.'
  where slug = 'sqli-101';

update challenges set
  description = 'A JWT verifier accepts alg=none. Why is that dangerous? Flag body: `never_trust_alg_none` — wrap with your event''s prefix.'
  where slug = 'jwt-none';

-- --- crypto ---
update challenges set
  description = E'Decode this base64 to get the flag body, then wrap with your event''s prefix:\n\nYmFzZTY0X2lzX25vdF9lbmNyeXB0aW9u'
  where slug = 'base-what';

update challenges set
  description = E'Decode this Caesar (shift 3) to get the flag body, then wrap with your event''s prefix:\n\nfdhvdu_lv_fodvvlf'
  where slug = 'caesar-salad';

update challenges set
  description = E'Decode this ROT47 to get the flag body, then wrap with your event''s prefix:\n\nC@Ecf0:D0DE:==0426D2C'
  where slug = 'rot47';

update challenges set
  description = E'Key: "ctf" (the encryption key, NOT the flag prefix).\nCiphertext (hex): 09 01 15 17 2b 1e 0c 06 39 0a 00\nXOR to decode → that''s the flag body. Wrap with your event''s prefix.'
  where slug = 'xor-magic';

update challenges set
  description = 'Given n=3233, e=17, c=855. Recover m. The integer m is your flag body — wrap with your event''s prefix.'
  where slug = 'small-rsa';

-- --- forensics ---
update challenges set
  description = 'Image metadata can leak a lot. Imagine a .jpg whose EXIF Comment is `exif_data_is_revealing`. That string is your flag body — wrap with your event''s prefix.'
  where slug = 'exif-hunter';

update challenges set
  description = 'Running `strings ./binary` on the attached file would reveal the body: `strings_command_for_the_win`. Wrap with your event''s prefix.'
  where slug = 'strings-binary';

-- pcap-hunt and stego-lsb: descriptions don't mention ctf — leave as-is

-- --- pwn ---
update challenges set
  description = 'A 32-byte buffer with no canary, no NX. Overflow it past the saved return to call win(). Conceptual flag body: `smash_the_stack` — wrap with your event''s prefix.'
  where slug = 'bof-101';

update challenges set
  description = 'printf(user_input) without a format specifier. %x leaks memory; %n writes. Conceptual flag body: `format_strings_leak_memory` — wrap with your event''s prefix.'
  where slug = 'format-string';

update challenges set
  description = 'NX is on, ASLR off. Find gadgets in libc, chain a syscall. Conceptual flag body: `return_oriented_programming` — wrap with your event''s prefix.'
  where slug = 'rop-chain';
