(function(angular){
  var app = angular.module('promiseApp');

    var snippets = [
        {
            name: 'Select a sample...',
            desc: '',
            snip: ''
        },
        {
            name: 'Simple exception handling',
            desc: `A simple visual example of the then/catch relationship.
A Catch can be invoked by an ancestor only, a sibling will never trigger a catch.

Run the example.

Once done, switch to "Tree View", you will see an origin Promise with id #0.
Notice that it has 3 direct children which #0 will resolve to.
Also notice that #1 & #3 are "Then" promises and they both raised an exception.
#4 is a "Catch" promise and a direct child of #3 ("Then"), since #3 raised an exception #4 handled it.
#1 has no children, the exception fired by #1 is lost forever.
#2 is a "Catch" promise, it is a sibling of 1 thus it will never catch an exception from one, what will it catch then?
Well, #2 will catch a reject call from #0, simple.
`,
        snip:
`var promise = Promise.resolve(100);

promise
    .then(function(v) {
        throw new Error("I am an error!");
    });

promise
    .catch(function(err) {
        alert("I shall not pop up!");
    });

promise.then(function(v) {
        throw new Error("I am an error!");
    })
    .catch(function(err) {

    });

createPromiseTree(400,null);
`
        },
        {
            name: 'Chained exception handling',
            desc:
`A visual example showing how promises work when an exception is raised
in the middle of the chain, allowing the chain to recover and continue.

This example is a straight chain where once promise provides a value to the next.
The variable 'shouldIThrow' indicates if #2 should throw and excption or not.

Chande 'shouldIThrow' to false, Run the example.
Once done, switch to "Tree View", you will see an origin Promise with id #0.

If 'shouldIThrow' = false then the process is:
Get a Value, multiply by 2, devide by 2, return it (should be the same as original value)
Notice we are skipping #4, we never had an exception so we don't "Catch"...


Chande 'shouldIThrow' to true, Run the example.
Once done, switch to "Tree View", you will see an origin Promise with id #0.

If 'shouldIThrow' = true then an exception is raised in the middle, breaking
up the process and returning the value -1.
Notice that #2 is throwing an exception which cause a jump to the
next "Catch" in the chain (#4), we skip #3 here, it is never invoked.`,
            snip:
`var promise = Promise.resolve(100);

var shouldIThrow = false;

promise
    .then(function(v) {
        return v/2;
    })
    .then(function(v) {
        if (shouldIThrow) throw new Error();
        return v;
    })
    .then(function(v) {
        return v * 2;
    })
    .catch(function(err) {
        // handle it.
        return -1;
    })
    .then(function(v) {
        return v;
    });


createPromiseTree(0,null);`
        },
        {
            name: 'Scoped promises.',
            desc:
`A visual example of "Promise.all".

Promise.all is a great example of what PromsieTree defines as "ZonePromise", a promise that runs under the scope of
another promise.

The logic is simple, a function called 'createPromise' returns a promise that will resolve a supplied value after a a supplied time.
We create an array of 4 promises resolving different values in different times.

Notice #13 is a chained promise to #4 "Promise.all" but all the "ZonePromise" nodes are not chained.
They run under the scope of #4 and the logic #4 implements is to collect the values of all of them and resolve once they are all resolved.
#13 simply add up all the value return, which should yield 50.

The total time it will take to resolve all promises is the total time it will take the longest promise to resolve.
In our case, 1000 MS (1 second), we might see a message telling us it took a little bit more then 1000 MS (1001, 1002)

Note: You can see the "Promise.all" has the ID #4 which is not the 1st promise to run.
This is because the "ZonePromise" nodes are not really scoped physically inside #4, they are logically scoped.
Promise.all is a great example to see how multiple promises work to generate a single value.
`,
            snip:
`function createPromise(timeoutMS, value) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {resolve(value);}, timeoutMS);
    });
}

var arr = [];
arr.push(createPromise(250, 5));
arr.push(createPromise(500, 10));
arr.push(createPromise(750, 15));
arr.push(createPromise(1000, 20));

var time = new Date();
Promise.all(arr)
    .then(function(value) {
        createPromiseTree(0,null);

        alert("It took us " + (new Date() - time) + " MS to get here.");

        var total = 0;
        value.forEach(function(v) {total += v;})
        return total;
    });`
        },
        {
            name: 'Exponential child growth',
            desc: 'Each node have N+1 children, where N is the node`s level.',
            snip:
`function expoGrowth(p,n, limit) {
  var arr = [];

  for (var i=0; i<n;i++){
    arr.push(
        (n % 2 == 0) ? p.then(function(v){throw Error}) : p.catch(function(err){})
    );
  }

  if (n<limit) {
    for(var i=0; i<arr.length; i++){
      expoGrowth(arr[i], n+1, limit);
    }
  }
}

expoGrowth(Promise.resolve(0), 2, 4);
createPromiseTree(400,null);`
        },
        {
          name: 'Advanced',
          desc: 'l.',
          snip:
`function getNumberPromise(num, ms) {
  return new Promise(function(res,rej){
    var count = 0;
    for (var i=0; i<5; i++) {
      var p = new Promise(function(res1, rej1){
        setTimeout(function(){
          new Promise(function(res2, rej2){
            res2(num);

          }).then(function(val){
              res1(num);
            });
        }, ms/2);
      });
      p.then(function(val){
        setTimeout(function(){
          count++;
          if (count == 5) {
            res(val);
          }

        }, ms/2);
      })
        .catch(function(err){
          rej(err);
        });
    }
  });
}

var prm = new Promise(function(res,rej){
  setTimeout(function(){res(15);}, 100);
});

prm.catch(function(err){});

var pTest = prm.then(function(v){
  return getNumberPromise(v, 1000)
    .then(function(v){return 9999;});
});

pTest.then(function(v) {return v+1;});
pTest.then(function(v) {return getNumberPromise(v, 50);});

prm
  .then(function(v) {return v-1;})
  .then(function(v) {return v*2;})
  .then(function(v) {throw new Error("XYZ");})
  .then(function(v) {console.log("THEN BEFORE: ", v);})
  .catch(function(v) {
    console.log("ERROR: ",v);
  })
  .then(function(v) {console.log("THEN AFTER: ", v);});

prm
  .then(function(v) {return v+1;})
  .then(function(v) {return v/2;})
  .then(function(v) {throw new Error("XYZ");})
  .then(function(v) {console.log("THEN BEFORE: ", v);})
  .catch(function(v) {
    console.log("ERROR: ",v);
  })
  .then(function(v) {console.log("THEN AFTER: ", v);});

createPromiseTree(1500,null);`
        }
      ];





  app.constant('snippets', snippets);
})((<any>window).angular); // this is temp, just to skip TS config right now, TODO for later...
