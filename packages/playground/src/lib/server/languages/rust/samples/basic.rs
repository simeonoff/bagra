use std::collections::HashMap;

/// A simple in-memory key-value store backed by a `HashMap`.
#[derive(Debug, Default)]
pub struct Store<V> {
    data: HashMap<String, V>,
}

impl<V: Clone> Store<V> {
    pub fn new() -> Self {
        Self {
            data: HashMap::new(),
        }
    }

    pub fn set(&mut self, key: impl Into<String>, value: V) {
        self.data.insert(key.into(), value);
    }

    pub fn get(&self, key: &str) -> Option<&V> {
        self.data.get(key)
    }

    pub fn remove(&mut self, key: &str) -> Option<V> {
        self.data.remove(key)
    }

    pub fn len(&self) -> usize {
        self.data.len()
    }

    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
}

/// Error type for store operations.
#[derive(Debug)]
pub enum StoreError {
    KeyNotFound(String),
    Io(std::io::Error),
}

impl std::fmt::Display for StoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StoreError::KeyNotFound(key) => write!(f, "key not found: {key}"),
            StoreError::Io(err) => write!(f, "I/O error: {err}"),
        }
    }
}

impl std::error::Error for StoreError {}

impl From<std::io::Error> for StoreError {
    fn from(err: std::io::Error) -> Self {
        StoreError::Io(err)
    }
}

fn main() {
    let mut store: Store<i32> = Store::new();

    store.set("answer", 42);
    store.set("pi", 3);

    match store.get("answer") {
        Some(v) => println!("answer = {v}"),
        None => eprintln!("not found"),
    }

    let keys: Vec<&str> = ["answer", "pi", "missing"]
        .iter()
        .filter(|&&k| store.get(k).is_some())
        .copied()
        .collect();

    println!("present keys: {keys:?}");
}
