const { prisma } = require('./database');

const round1Questions = [
  {
    questionNumber: 1,
    title: 'Second Largest Number',
    marks: 100,
    hint: 'Initialize largest and second before iterating through the list.',
    finalCode: `nums = list(map(int, input().split()))
largest = nums[0]
second = None

for n in nums:
    if n > largest:
        second = largest
        largest = n
    elif n != largest and (second is None or n > second):
        second = n

print(second)`,
    shuffledCode: `for n in nums:
    if n > largest:
        second = largest
nums = list(map(int, input().split()))
        largest = n
    elif n != largest and (second is None or n > second):
        second = n
largest = nums[0]
print(second)
second = None`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['nums = list(map(int, input().split()))'], orderGroup: 1 },
        { id: 2, lines: ['largest = nums[0]'], orderGroup: 2 },
        { id: 3, lines: ['second = None'], orderGroup: 2 },
        {
          id: 4,
          lines: [
            'for n in nums:',
            '    if n > largest:',
            '        second = largest',
            '        largest = n',
            '    elif n != largest and (second is None or n > second):',
            '        second = n'
          ],
          orderGroup: 3
        },
        { id: 5, lines: ['print(second)'], orderGroup: 4 }
      ]
    }
  },
  {
    questionNumber: 2,
    title: 'Move All Zeros to End',
    marks: 100,
    hint: 'Collect non-zero elements first, then append zeros.',
    finalCode: `nums = list(map(int, input().split()))
result = []
zeros = 0

for n in nums:
    if n == 0:
        zeros += 1
    else:
        result.append(n)

for i in range(zeros):
    result.append(0)

print(*result)`,
    shuffledCode: `for i in range(zeros):
    result.append(0)
nums = list(map(int, input().split()))
    else:
        result.append(n)
print(*result)
zeros = 0
for n in nums:
    if n == 0:
        zeros += 1
result = []`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['nums = list(map(int, input().split()))'], orderGroup: 1 },
        { id: 2, lines: ['result = []'], orderGroup: 2 },
        { id: 3, lines: ['zeros = 0'], orderGroup: 2 },
        {
          id: 4,
          lines: [
            'for n in nums:',
            '    if n == 0:',
            '        zeros += 1',
            '    else:',
            '        result.append(n)'
          ],
          orderGroup: 3
        },
        {
          id: 5,
          lines: [
            'for i in range(zeros):',
            '    result.append(0)'
          ],
          orderGroup: 4
        },
        { id: 6, lines: ['print(*result)'], orderGroup: 5 }
      ]
    }
  },
  {
    questionNumber: 3,
    title: 'Remove Duplicate Characters',
    marks: 100,
    hint: 'Read input and initialize an empty result string before checking characters.',
    finalCode: `s = input()
result = ""

for ch in s:
    if ch not in result:
        result += ch

print(result)`,
    shuffledCode: `for ch in s:
    if ch not in result:
print(result)
        result += ch
s = input()
result = ""`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['s = input()'], orderGroup: 1 },
        { id: 2, lines: ['result = ""'], orderGroup: 1 },
        {
          id: 3,
          lines: [
            'for ch in s:',
            '    if ch not in result:',
            '        result += ch'
          ],
          orderGroup: 2
        },
        { id: 4, lines: ['print(result)'], orderGroup: 3 }
      ]
    }
  },
  {
    questionNumber: 4,
    title: 'Find Missing Number',
    marks: 100,
    hint: 'Calculate expected sum of n natural numbers and subtract actual sum.',
    finalCode: `nums = list(map(int, input().split()))
n = len(nums) + 1

expected = n * (n + 1) // 2
actual = 0

for num in nums:
    actual += num

missing = expected - actual
print(missing)`,
    shuffledCode: `actual = 0
nums = list(map(int, input().split()))
missing = expected - actual
for num in nums:
    actual += num
n = len(nums) + 1
print(missing)
expected = n * (n + 1) // 2`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['nums = list(map(int, input().split()))'], orderGroup: 1 },
        { id: 2, lines: ['n = len(nums) + 1'], orderGroup: 2 },
        { id: 3, lines: ['expected = n * (n + 1) // 2'], orderGroup: 3 },
        { id: 4, lines: ['actual = 0'], orderGroup: 3 },
        {
          id: 5,
          lines: [
            'for num in nums:',
            '    actual += num'
          ],
          orderGroup: 4
        },
        { id: 6, lines: ['missing = expected - actual'], orderGroup: 5 },
        { id: 7, lines: ['print(missing)'], orderGroup: 6 }
      ]
    }
  },
  {
    questionNumber: 5,
    title: 'Find Frequency of Each Element',
    marks: 100,
    hint: 'Read input and initialize frequency dictionary before counting.',
    finalCode: `nums = list(map(int, input().split()))
freq = {}

for num in nums:
    if num in freq:
        freq[num] += 1
    else:
        freq[num] = 1

for key in freq:
    print(key, freq[key])`,
    shuffledCode: `for key in freq:
    print(key, freq[key])
nums = list(map(int, input().split()))

for num in nums:
    if num in freq:
        freq[num] += 1
freq = {}

    else:
        freq[num] = 1`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['nums = list(map(int, input().split()))'], orderGroup: 1 },
        { id: 2, lines: ['freq = {}'], orderGroup: 1 },
        {
          id: 3,
          lines: [
            'for num in nums:',
            '    if num in freq:',
            '        freq[num] += 1',
            '    else:',
            '        freq[num] = 1'
          ],
          orderGroup: 2
        },
        {
          id: 4,
          lines: [
            'for key in freq:',
            '    print(key, freq[key])'
          ],
          orderGroup: 3
        }
      ]
    }
  },
  {
    questionNumber: 6,
    title: 'Rotate a List by K Positions',
    marks: 100,
    hint: 'Read list and k before normalizing k by list length.',
    finalCode: `nums = list(map(int, input().split()))
k = int(input())

n = len(nums)
k = k % n

rotated = nums[-k:] + nums[:-k]

print(*rotated)`,
    shuffledCode: `rotated = nums[-k:] + nums[:-k]

nums = list(map(int, input().split()))
k = int(input())

print(*rotated)

n = len(nums)
k = k % n`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['nums = list(map(int, input().split()))'], orderGroup: 1 },
        { id: 2, lines: ['k = int(input())'], orderGroup: 1 },
        { id: 3, lines: ['n = len(nums)'], orderGroup: 2 },
        { id: 4, lines: ['k = k % n'], orderGroup: 3 },
        { id: 5, lines: ['rotated = nums[-k:] + nums[:-k]'], orderGroup: 4 },
        { id: 6, lines: ['print(*rotated)'], orderGroup: 5 }
      ]
    }
  },
  {
    questionNumber: 7,
    title: 'Employee Details',
    marks: 100,
    hint: 'Define Employee class before creating employee instance.',
    finalCode: `class Employee:
    def _init_(self, name, salary):
        self.name = name
        self.salary = salary

    def display(self):
        print("Employee:", self.name)
        print("Salary:", self.salary)

name = input()
salary = int(input())

employee = Employee(name, salary)
employee.display()`,
    shuffledCode: `salary = int(input())

class Employee:
    def init(self, name, salary):
        self.name = name
        self.salary = salary

employee = Employee(name, salary)

    def display(self):
        print("Employee:", self.name)
        print("Salary:", self.salary)

name = input()

employee.display()`,
    orderingRules: {
      blocks: [
        {
          id: 1,
          lines: [
            'class Employee:',
            '    def _init_(self, name, salary):',
            '        self.name = name',
            '        self.salary = salary',
            '    def display(self):',
            '        print("Employee:", self.name)',
            '        print("Salary:", self.salary)'
          ],
          orderGroup: 1
        },
        { id: 2, lines: ['name = input()'], orderGroup: 1 },
        { id: 3, lines: ['salary = int(input())'], orderGroup: 1 },
        { id: 4, lines: ['employee = Employee(name, salary)'], orderGroup: 2 },
        { id: 5, lines: ['employee.display()'], orderGroup: 3 }
      ]
    }
  },
  {
    questionNumber: 8,
    title: 'Vehicle Rental System',
    marks: 100,
    hint: 'Define base class Vehicle before derived classes Car and Bike.',
    finalCode: `class Vehicle:
    def _init_(self, name, days):
        self.name = name
        self.days = days

    def rental_cost(self):
        return self.days * 500

class Car(Vehicle):
    def rental_cost(self):
        return self.days * 1000

class Bike(Vehicle):
    def rental_cost(self):
        return self.days * 400

name = input()
days = int(input())
vehicle_type = input().lower()

if vehicle_type == "car":
    vehicle = Car(name, days)
elif vehicle_type == "bike":
    vehicle = Bike(name, days)
else:
    vehicle = Vehicle(name, days)

print("Vehicle:", vehicle.name)
print("Days:", vehicle.days)
print("Rental Cost:", vehicle.rental_cost())`,
    shuffledCode: `class Car(Vehicle):
    def rental_cost(self):
        return self.days * 1000

name = input()
days = int(input())
vehicle_type = input().lower()

class Vehicle:
    def _init_(self, name, days):
        self.name = name
        self.days = days

class Bike(Vehicle):
    def rental_cost(self):
        return self.days * 400

if vehicle_type == "car":
    vehicle = Car(name, days)
elif vehicle_type == "bike":
    vehicle = Bike(name, days)
else:
    vehicle = Vehicle(name, days)

print("Vehicle:", vehicle.name)
print("Days:", vehicle.days)
print("Rental Cost:", vehicle.rental_cost())

def rental_cost(self):
    return self.days * 500`,
    orderingRules: {
      blocks: [
        {
          id: 1,
          lines: [
            'class Vehicle:',
            '    def _init_(self, name, days):',
            '        self.name = name',
            '        self.days = days',
            '    def rental_cost(self):',
            '        return self.days * 500'
          ],
          orderGroup: 1
        },
        {
          id: 2,
          lines: [
            'class Car(Vehicle):',
            '    def rental_cost(self):',
            '        return self.days * 1000'
          ],
          orderGroup: 2
        },
        {
          id: 3,
          lines: [
            'class Bike(Vehicle):',
            '    def rental_cost(self):',
            '        return self.days * 400'
          ],
          orderGroup: 2
        },
        { id: 4, lines: ['name = input()'], orderGroup: 3 },
        { id: 5, lines: ['days = int(input())'], orderGroup: 3 },
        { id: 6, lines: ['vehicle_type = input().lower()'], orderGroup: 3 },
        {
          id: 7,
          lines: [
            'if vehicle_type == "car":',
            '    vehicle = Car(name, days)',
            'elif vehicle_type == "bike":',
            '    vehicle = Bike(name, days)',
            'else:',
            '    vehicle = Vehicle(name, days)'
          ],
          orderGroup: 4
        },
        { id: 8, lines: ['print("Vehicle:", vehicle.name)'], orderGroup: 5 },
        { id: 9, lines: ['print("Days:", vehicle.days)'], orderGroup: 5 },
        { id: 10, lines: ['print("Rental Cost:", vehicle.rental_cost())'], orderGroup: 5 }
      ]
    }
  },
  {
    questionNumber: 9,
    title: 'Bank Transaction System',
    marks: 100,
    hint: 'Read inputs balance, choice, and amount before branch handling.',
    finalCode: `balance = int(input())
choice = int(input())
amount = int(input())

if choice == 1:
    balance += amount
    print("Deposited:", amount)
elif choice == 2:
    if amount <= balance:
        balance -= amount
        print("Withdrawn:", amount)
    else:
        print("Insufficient Balance")
elif choice == 3:
    print("Current Balance:", balance)
else:
    print("Invalid Choice")

if balance >= 10000:
    print("Premium Balance")
elif balance >= 5000:
    print("Good Balance")
else:
    print("Low Balance")

print("Final Balance:", balance)`,
    shuffledCode: `if balance >= 10000:
    print("Premium Balance")
elif balance >= 5000:
    print("Good Balance")
else:
    print("Low Balance")

balance = int(input())
choice = int(input())
amount = int(input())

elif choice == 2:
    if amount <= balance:
        balance -= amount
        print("Withdrawn:", amount)
    else:
        print("Insufficient Balance")

print("Final Balance:", balance)

if choice == 1:
    balance += amount
    print("Deposited:", amount)

elif choice == 3:
    print("Current Balance:", balance)
else:
    print("Invalid Choice")`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['balance = int(input())'], orderGroup: 1 },
        { id: 2, lines: ['choice = int(input())'], orderGroup: 1 },
        { id: 3, lines: ['amount = int(input())'], orderGroup: 1 },
        {
          id: 4,
          lines: [
            'if choice == 1:',
            '    balance += amount',
            '    print("Deposited:", amount)',
            'elif choice == 2:',
            '    if amount <= balance:',
            '        balance -= amount',
            '        print("Withdrawn:", amount)',
            '    else:',
            '        print("Insufficient Balance")',
            'elif choice == 3:',
            '    print("Current Balance:", balance)',
            'else:',
            '    print("Invalid Choice")'
          ],
          orderGroup: 2
        },
        {
          id: 5,
          lines: [
            'if balance >= 10000:',
            '    print("Premium Balance")',
            'elif balance >= 5000:',
            '    print("Good Balance")',
            'else:',
            '    print("Low Balance")'
          ],
          orderGroup: 3
        },
        { id: 6, lines: ['print("Final Balance:", balance)'], orderGroup: 4 }
      ]
    }
  },
  {
    questionNumber: 10,
    title: 'Two Sum',
    marks: 100,
    hint: 'Initialize seen dictionary before searching for target complement.',
    finalCode: `nums = list(map(int, input().split()))
target = int(input())

seen = {}

for i in range(len(nums)):
    complement = target - nums[i]

    if complement in seen:
        print(seen[complement], i)
        break

    seen[nums[i]] = i
else:
    print("No Pair Found")`,
    shuffledCode: `seen[nums[i]] = i

nums = list(map(int, input().split()))
target = int(input())

if complement in seen:
    print(seen[complement], i)
    break

for i in range(len(nums)):
    complement = target - nums[i]

else:
    print("No Pair Found")

seen = {}`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['nums = list(map(int, input().split()))'], orderGroup: 1 },
        { id: 2, lines: ['target = int(input())'], orderGroup: 1 },
        { id: 3, lines: ['seen = {}'], orderGroup: 1 },
        {
          id: 4,
          lines: [
            'for i in range(len(nums)):',
            '    complement = target - nums[i]',
            '    if complement in seen:',
            '        print(seen[complement], i)',
            '        break',
            '    seen[nums[i]] = i',
            'else:',
            '    print("No Pair Found")'
          ],
          orderGroup: 2
        }
      ]
    }
  }
];

const round2Questions = [
  {
    questionNumber: 1,
    title: 'Count Words Starting with Vowel',
    marks: 100,
    hint: 'Initialize vowels and count before iterating words.',
    finalCode: `words = input().split()
vowels = "aeiou"
count = 0

for word in words:
    first = word[0].lower()

    if first in vowels:
        count += 1

print(count)`,
    shuffledCode: `            if first in vowels:
words = input().split()
    first = word[0].lower()
print(count)
for word in words:
count = 0
        count += 1
vowels = "aeiou"`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['words = input().split()'], orderGroup: 1 },
        { id: 2, lines: ['vowels = "aeiou"'], orderGroup: 1 },
        { id: 3, lines: ['count = 0'], orderGroup: 1 },
        {
          id: 4,
          lines: [
            'for word in words:',
            '    first = word[0].lower()',
            '    if first in vowels:',
            '        count += 1'
          ],
          orderGroup: 2
        },
        { id: 5, lines: ['print(count)'], orderGroup: 3 }
      ]
    }
  },
  {
    questionNumber: 2,
    title: 'Common Elements in Two Lists',
    marks: 100,
    hint: 'Read lists a and b and initialize common list before checking membership.',
    finalCode: `a = list(map(int, input().split()))
b = list(map(int, input().split()))
common = []

for x in a:
    if x in b and x not in common:
        common.append(x)

print(*common)`,
    shuffledCode: `for x in a:
print(*common)
b = list(map(int, input().split()))
    if x in b and x not in common:
common = []
a = list(map(int, input().split()))
        common.append(x)`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['a = list(map(int, input().split()))'], orderGroup: 1 },
        { id: 2, lines: ['b = list(map(int, input().split()))'], orderGroup: 1 },
        { id: 3, lines: ['common = []'], orderGroup: 1 },
        {
          id: 4,
          lines: [
            'for x in a:',
            '    if x in b and x not in common:',
            '        common.append(x)'
          ],
          orderGroup: 2
        },
        { id: 5, lines: ['print(*common)'], orderGroup: 3 }
      ]
    }
  },
  {
    questionNumber: 3,
    title: 'Second Most Frequent Character',
    marks: 100,
    hint: 'Collect character frequencies and sort items by frequency descending.',
    finalCode: `s = input()
freq = {}

for ch in s:
    if ch != " ":
        freq[ch] = freq.get(ch, 0) + 1

items = sorted(freq.items(), key=lambda x: x[1], reverse=True)

if len(items) < 2:
    print("Not Possible")
else:
    print(items[1][0])`,
    shuffledCode: `items = sorted(freq.items(), key=lambda x: x[1], reverse=True)

s = input()
freq = {}

if len(items) < 2:
    print("Not Possible")

for ch in s:
    if ch != " ":
        freq[ch] = freq.get(ch, 0) + 1

else:
    print(items[1][0])`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['s = input()'], orderGroup: 1 },
        { id: 2, lines: ['freq = {}'], orderGroup: 1 },
        {
          id: 3,
          lines: [
            'for ch in s:',
            '    if ch != " ":',
            '        freq[ch] = freq.get(ch, 0) + 1'
          ],
          orderGroup: 2
        },
        { id: 4, lines: ['items = sorted(freq.items(), key=lambda x: x[1], reverse=True)'], orderGroup: 3 },
        {
          id: 5,
          lines: [
            'if len(items) < 2:',
            '    print("Not Possible")',
            'else:',
            '    print(items[1][0])'
          ],
          orderGroup: 4
        }
      ]
    }
  },
  {
    questionNumber: 4,
    title: 'Check if Two Strings are Anagrams',
    marks: 100,
    hint: 'Normalize strings by removing spaces and converting to lowercase before comparing.',
    finalCode: `s1 = input().lower()
s2 = input().lower()

s1 = s1.replace(" ", "")
s2 = s2.replace(" ", "")

if len(s1) != len(s2):
    print("Not Anagram")
elif sorted(s1) == sorted(s2):
    print("Anagram")
else:
    print("Not Anagram")`,
    shuffledCode: `if len(s1) != len(s2):
    print("Not Anagram")

s1 = input().lower()
s2 = input().lower()

else:
    print("Not Anagram")

s1 = s1.replace(" ", "")
s2 = s2.replace(" ", "")

elif sorted(s1) == sorted(s2):
    print("Anagram")`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['s1 = input().lower()'], orderGroup: 1 },
        { id: 2, lines: ['s2 = input().lower()'], orderGroup: 1 },
        { id: 3, lines: ['s1 = s1.replace(" ", "")'], orderGroup: 2 },
        { id: 4, lines: ['s2 = s2.replace(" ", "")'], orderGroup: 2 },
        {
          id: 5,
          lines: [
            'if len(s1) != len(s2):',
            '    print("Not Anagram")',
            'elif sorted(s1) == sorted(s2):',
            '    print("Anagram")',
            'else:',
            '    print("Not Anagram")'
          ],
          orderGroup: 3
        }
      ]
    }
  },
  {
    questionNumber: 5,
    title: 'Student Details',
    marks: 100,
    hint: 'Define Student class before instantiating student.',
    finalCode: `class Student:
    def _init_(self, name, age):
        self.name = name
        self.age = age

    def display(self):
        print("Name:", self.name)
        print("Age:", self.age)

name = input()
age = int(input())

student = Student(name, age)
student.display()`,
    shuffledCode: `    def display(self):
        print("Name:", self.name)
        print("Age:", self.age)

student = Student(name, age)

class Student:
    def init(self, name, age):
        self.name = name
        self.age = age

name = input()
age = int(input())

student.display()`,
    orderingRules: {
      blocks: [
        {
          id: 1,
          lines: [
            'class Student:',
            '    def _init_(self, name, age):',
            '        self.name = name',
            '        self.age = age',
            '    def display(self):',
            '        print("Name:", self.name)',
            '        print("Age:", self.age)'
          ],
          orderGroup: 1
        },
        { id: 2, lines: ['name = input()'], orderGroup: 1 },
        { id: 3, lines: ['age = int(input())'], orderGroup: 1 },
        { id: 4, lines: ['student = Student(name, age)'], orderGroup: 2 },
        { id: 5, lines: ['student.display()'], orderGroup: 3 }
      ]
    }
  },
  {
    questionNumber: 6,
    title: 'Rectangle Area',
    marks: 100,
    hint: 'Define Rectangle class before instantiating and calling area().',
    finalCode: `class Rectangle:
    def _init_(self, length, breadth):
        self.length = length
        self.breadth = breadth

    def area(self):
        return self.length * self.breadth

length = int(input())
breadth = int(input())

rect = Rectangle(length, breadth)
result = rect.area()

print("Area:", result)`,
    shuffledCode: `length = int(input())
breadth = int(input())

class Rectangle:
    def init(self, length, breadth):
        self.length = length
        self.breadth = breadth

result = rect.area()

def area(self):
    return self.length * self.breadth

rect = Rectangle(length, breadth)

print("Area:", result)`,
    orderingRules: {
      blocks: [
        {
          id: 1,
          lines: [
            'class Rectangle:',
            '    def _init_(self, length, breadth):',
            '        self.length = length',
            '        self.breadth = breadth',
            '    def area(self):',
            '        return self.length * self.breadth'
          ],
          orderGroup: 1
        },
        { id: 2, lines: ['length = int(input())'], orderGroup: 1 },
        { id: 3, lines: ['breadth = int(input())'], orderGroup: 1 },
        { id: 4, lines: ['rect = Rectangle(length, breadth)'], orderGroup: 2 },
        { id: 5, lines: ['result = rect.area()'], orderGroup: 3 },
        { id: 6, lines: ['print("Area:", result)'], orderGroup: 4 }
      ]
    }
  },
  {
    questionNumber: 7,
    title: 'Shape Area Calculator',
    marks: 100,
    hint: 'Define base Shape class before Circle and Rectangle subclasses.',
    finalCode: `class Shape:
    def area(self):
        return 0

class Circle(Shape):
    def _init_(self, radius):
        self.radius = radius

    def area(self):
        return 3.14 * self.radius * self.radius

class Rectangle(Shape):
    def _init_(self, length, breadth):
        self.length = length
        self.breadth = breadth

    def area(self):
        return self.length * self.breadth

choice = input().lower()

if choice == "circle":
    radius = float(input())
    shape = Circle(radius)
elif choice == "rectangle":
    length = float(input())
    breadth = float(input())
    shape = Rectangle(length, breadth)
else:
    shape = Shape()

print("Area:", shape.area())`,
    shuffledCode: `class Rectangle(Shape):
    def _init_(self, length, breadth):
        self.length = length
        self.breadth = breadth

choice = input().lower()

class Shape:
    def area(self):
        return 0

if choice == "circle":
    radius = float(input())
    shape = Circle(radius)
elif choice == "rectangle":
    length = float(input())
    breadth = float(input())
    shape = Rectangle(length, breadth)

class Circle(Shape):
    def _init_(self, radius):
        self.radius = radius

    def area(self):
        return 3.14 * self.radius * self.radius

print("Area:", shape.area())

    def area(self):
        return self.length * self.breadth

else:
    shape = Shape()`,
    orderingRules: {
      blocks: [
        {
          id: 1,
          lines: [
            'class Shape:',
            '    def area(self):',
            '        return 0'
          ],
          orderGroup: 1
        },
        {
          id: 2,
          lines: [
            'class Circle(Shape):',
            '    def _init_(self, radius):',
            '        self.radius = radius',
            '    def area(self):',
            '        return 3.14 * self.radius * self.radius'
          ],
          orderGroup: 2
        },
        {
          id: 3,
          lines: [
            'class Rectangle(Shape):',
            '    def _init_(self, length, breadth):',
            '        self.length = length',
            '        self.breadth = breadth',
            '    def area(self):',
            '        return self.length * self.breadth'
          ],
          orderGroup: 2
        },
        { id: 4, lines: ['choice = input().lower()'], orderGroup: 3 },
        {
          id: 5,
          lines: [
            'if choice == "circle":',
            '    radius = float(input())',
            '    shape = Circle(radius)',
            'elif choice == "rectangle":',
            '    length = float(input())',
            '    breadth = float(input())',
            '    shape = Rectangle(length, breadth)',
            'else:',
            '    shape = Shape()'
          ],
          orderGroup: 4
        },
        { id: 6, lines: ['print("Area:", shape.area())'], orderGroup: 5 }
      ]
    }
  },
  {
    questionNumber: 8,
    title: 'Longest Substring Without Repeating Characters',
    marks: 100,
    hint: 'Initialize seen set, left pointer, and longest before iterating right pointer.',
    finalCode: `s = input()

seen = set()
left = 0
longest = 0

for right in range(len(s)):
    while s[right] in seen:
        seen.remove(s[left])
        left += 1

    seen.add(s[right])

    current = right - left + 1

    if current > longest:
        longest = current

print(longest)`,
    shuffledCode: `seen.add(s[right])

s = input()

if current > longest:
    longest = current

while s[right] in seen:
    seen.remove(s[left])
    left += 1

current = right - left + 1

for right in range(len(s)):
    while s[right] in seen:
        seen.remove(s[left])
        left += 1

seen = set()
left = 0
longest = 0

print(longest)`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['s = input()'], orderGroup: 1 },
        { id: 2, lines: ['seen = set()'], orderGroup: 1 },
        { id: 3, lines: ['left = 0'], orderGroup: 1 },
        { id: 4, lines: ['longest = 0'], orderGroup: 1 },
        {
          id: 5,
          lines: [
            'for right in range(len(s)):',
            '    while s[right] in seen:',
            '        seen.remove(s[left])',
            '        left += 1',
            '    seen.add(s[right])',
            '    current = right - left + 1',
            '    if current > longest:',
            '        longest = current'
          ],
          orderGroup: 2
        },
        { id: 6, lines: ['print(longest)'], orderGroup: 3 }
      ]
    }
  },
  {
    questionNumber: 9,
    title: 'Product of Array Except Self',
    marks: 100,
    hint: 'Compute prefix products in first pass and suffix products in reverse pass.',
    finalCode: `nums = list(map(int, input().split()))
n = len(nums)

result = [1] * n

prefix = 1

for i in range(n):
    result[i] = prefix
    prefix *= nums[i]

suffix = 1

for i in range(n - 1, -1, -1):
    result[i] *= suffix
    suffix *= nums[i]

print(*result)`,
    shuffledCode: `for i in range(n - 1, -1, -1):
    result[i] *= suffix
    suffix *= nums[i]

nums = list(map(int, input().split()))
n = len(nums)

prefix = 1

for i in range(n):
    result[i] = prefix
    prefix *= nums[i]

print(*result)

suffix = 1

result = [1] * n`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['nums = list(map(int, input().split()))'], orderGroup: 1 },
        { id: 2, lines: ['n = len(nums)'], orderGroup: 2 },
        { id: 3, lines: ['result = [1] * n'], orderGroup: 3 },
        { id: 4, lines: ['prefix = 1'], orderGroup: 3 },
        {
          id: 5,
          lines: [
            'for i in range(n):',
            '    result[i] = prefix',
            '    prefix *= nums[i]'
          ],
          orderGroup: 4
        },
        { id: 6, lines: ['suffix = 1'], orderGroup: 5 },
        {
          id: 7,
          lines: [
            'for i in range(n - 1, -1, -1):',
            '    result[i] *= suffix',
            '    suffix *= nums[i]'
          ],
          orderGroup: 6
        },
        { id: 8, lines: ['print(*result)'], orderGroup: 7 }
      ]
    }
  },
  {
    questionNumber: 10,
    title: 'Subarray Sum Equals K',
    marks: 100,
    hint: 'Track prefix sums in frequency map initialized with {0: 1}.',
    finalCode: `nums = list(map(int, input().split()))
k = int(input())

prefix_sum = 0
count = 0
freq = {0: 1}

for num in nums:
    prefix_sum += num

    if prefix_sum - k in freq:
        count += freq[prefix_sum - k]

    freq[prefix_sum] = freq.get(prefix_sum, 0) + 1

print(count)`,
    shuffledCode: `freq[prefix_sum] = freq.get(prefix_sum, 0) + 1

nums = list(map(int, input().split()))
k = int(input())

if prefix_sum - k in freq:
    count += freq[prefix_sum - k]

for num in nums:
    prefix_sum += num

print(count)

prefix_sum = 0
count = 0
freq = {0: 1}`,
    orderingRules: {
      blocks: [
        { id: 1, lines: ['nums = list(map(int, input().split()))'], orderGroup: 1 },
        { id: 2, lines: ['k = int(input())'], orderGroup: 1 },
        { id: 3, lines: ['prefix_sum = 0'], orderGroup: 2 },
        { id: 4, lines: ['count = 0'], orderGroup: 2 },
        { id: 5, lines: ['freq = {0: 1}'], orderGroup: 2 },
        {
          id: 6,
          lines: [
            'for num in nums:',
            '    prefix_sum += num',
            '    if prefix_sum - k in freq:',
            '        count += freq[prefix_sum - k]',
            '    freq[prefix_sum] = freq.get(prefix_sum, 0) + 1'
          ],
          orderGroup: 3
        },
        { id: 7, lines: ['print(count)'], orderGroup: 4 }
      ]
    }
  }
];

async function populateRounds() {
  console.log('=== Populating Round 1 and Round 2 Code Scramble Questions ===');

  // 1. Ensure Event 1 is named Code Scramble - Round 1
  const ev1 = await prisma.event.upsert({
    where: { id: 1 },
    update: {
      name: 'Code Scramble - Round 1',
      year: '2nd Year',
      questionsPerTeam: 5
    },
    create: {
      id: 1,
      name: 'Code Scramble - Round 1',
      year: '2nd Year',
      description: 'Round 1: Rearrange scrambled Python code blocks into the correct operational order.',
      timeLimitMinutes: 45,
      questionsPerTeam: 5,
      status: 'live'
    }
  });
  console.log(`Configured Event 1: ${ev1.name} (ID: ${ev1.id})`);

  // 2. Ensure Event 3 is named Code Scramble - Round 2
  let ev3 = await prisma.event.findFirst({
    where: { name: { contains: 'Round 2' } }
  });
  if (!ev3) {
    ev3 = await prisma.event.create({
      data: {
        name: 'Code Scramble - Round 2',
        year: '2nd Year',
        description: 'Round 2: Rearrange scrambled Python code blocks into the correct operational order.',
        timeLimitMinutes: 45,
        questionsPerTeam: 5,
        status: 'live'
      }
    });
  } else {
    ev3 = await prisma.event.update({
      where: { id: ev3.id },
      data: {
        name: 'Code Scramble - Round 2',
        year: '2nd Year',
        questionsPerTeam: 5
      }
    });
  }
  console.log(`Configured Event 3: ${ev3.name} (ID: ${ev3.id})`);

  // Helper to upsert question set for an event
  async function syncQuestions(eventId, qList) {
    for (let i = 0; i < qList.length; i++) {
      const qDef = qList[i];
      const qNum = qDef.questionNumber;
      const firstLine = qDef.finalCode.split('\n').find(l => l.trim() !== '') || '';

      const existingQ = await prisma.question.findFirst({
        where: { eventId, questionNumber: qNum }
      });

      if (existingQ) {
        await prisma.question.update({
          where: { id: existingQ.id },
          data: {
            title: qDef.title,
            marks: qDef.marks,
            hint: qDef.hint,
            hintPenalty: 5,
            isActive: 1,
            displayOrder: qNum,
            codeScrambleData: {
              upsert: {
                create: {
                  finalCode: qDef.finalCode,
                  shuffledCode: qDef.shuffledCode,
                  firstLine,
                  firstLinePenalty: 1,
                  orderingRules: JSON.stringify(qDef.orderingRules)
                },
                update: {
                  finalCode: qDef.finalCode,
                  shuffledCode: qDef.shuffledCode,
                  firstLine,
                  firstLinePenalty: 1,
                  orderingRules: JSON.stringify(qDef.orderingRules)
                }
              }
            }
          }
        });
        console.log(`  Updated Event ${eventId} Q#${qNum}: ${qDef.title}`);
      } else {
        await prisma.question.create({
          data: {
            eventId,
            questionNumber: qNum,
            title: qDef.title,
            marks: qDef.marks,
            hint: qDef.hint,
            hintPenalty: 5,
            isActive: 1,
            displayOrder: qNum,
            codeScrambleData: {
              create: {
                finalCode: qDef.finalCode,
                shuffledCode: qDef.shuffledCode,
                firstLine,
                firstLinePenalty: 1,
                orderingRules: JSON.stringify(qDef.orderingRules)
              }
            }
          }
        });
        console.log(`  Created Event ${eventId} Q#${qNum}: ${qDef.title}`);
      }
    }
  }

  console.log('\n--- Syncing Round 1 Questions (Event 1) ---');
  await syncQuestions(ev1.id, round1Questions);

  console.log('\n--- Syncing Round 2 Questions (Event ' + ev3.id + ') ---');
  await syncQuestions(ev3.id, round2Questions);

  console.log('\n=== Completed Round 1 & Round 2 Population Successfully ===');
}

if (require.main === module) {
  populateRounds()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('Error populating rounds:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { populateRounds, round1Questions, round2Questions };
