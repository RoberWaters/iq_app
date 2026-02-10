from data.practices.practice_2 import PRACTICE_2
from data.practices.practice_3 import PRACTICE_3
from data.practices.practice_4 import PRACTICE_4
from data.practices.practice_5 import PRACTICE_5
from data.practices.practice_6 import PRACTICE_6
from data.practices.practice_7 import PRACTICE_7
from data.practices.practice_8 import PRACTICE_8
from data.registry import register_practice

for p in [PRACTICE_2, PRACTICE_3, PRACTICE_4, PRACTICE_5, PRACTICE_6, PRACTICE_7, PRACTICE_8]:
    register_practice(p)
