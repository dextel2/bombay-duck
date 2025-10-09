// math_lib.rs
// Simple math utility CLI for add, mean, and prime check.

use std::env;

fn add(a: f64, b: f64) -> f64 {
    a + b
}

fn mean(nums: &[f64]) -> f64 {
    let sum: f64 = nums.iter().sum();
    sum / nums.len() as f64
}

fn is_prime(n: u64) -> bool {
    if n < 2 { return false; }
    if n % 2 == 0 { return n == 2; }
    let mut i = 3;
    while i * i <= n {
        if n % i == 0 { return false; }
        i += 2;
    }
    true
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("Usage:");
        println!("  add a b");
        println!("  mean a b c ...");
        println!("  prime n");
        return;
    }

    match args[1].as_str() {
        "add" => {
            if args.len() != 4 {
                println!("Usage: add a b");
                return;
            }
            let a = args[2].parse::<f64>().unwrap_or(0.0);
            let b = args[3].parse::<f64>().unwrap_or(0.0);
            println!("{}", add(a, b));
        }
        "mean" => {
            let nums: Vec<f64> = args[2..].iter().map(|x| x.parse::<f64>().unwrap_or(0.0)).collect();
            println!("{}", mean(&nums));
        }
        "prime" => {
            if args.len() != 3 {
                println!("Usage: prime n");
                return;
            }
            let n = args[2].parse::<u64>().unwrap_or(0);
            println!("{}", is_prime(n));
        }
        _ => println!("Unknown command"),
    }
}
