let table = document.querySelectorAll('table')[4];

let numbers = [];
let north = [];
let west = [];

for (row of table.rows) {
    numbers.push(row.cells[0].innerHTML.trim());
    north.push(row.cells[2].innerHTML.trim());
    west.push(row.cells[3].innerHTML.trim());
}
numbers.shift();
north.shift();
west.shift();

north = north.map(n => n.split(' '));
west = west.map(w => w.split(' '));

let x;
for (n of north){
    if (n.length == 2){
        x = n[0];
    } else {
        n.unshift(x);
    }
}

for (w of west){
    if (w.length == 2){
        x = w[0];
    } else {
        w.unshift(x);
    }
}

north = north.map(n => n.join(" "));
west = west.map(w => w.join(" "));

coords = north.map((n, i) => n + west[i]);
console.log(coords);